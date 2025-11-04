import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from './config.js';
import { logger } from './logger.js';
import { createStorage, type StorageAdapter } from './storage.js';
import { createRateLimiter } from './rateLimiter.js';
import { analyzeResume, isAllowedResumeMime } from './resume/analyzer.js';
import { extract_resume_info } from './resume/llm_analyzer.js';
import { scoreCompass } from './scoreCompass.js';
import { handleHRSearch } from './hrSearch.js';
import type { AssessmentInput, PlanTier, User } from './types.js';

const assessmentSchema = z.object({
  user: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      gender: z.string().optional(),
      nationality: z.string().optional(),
      educationLevel: z.enum(['Diploma', 'Bachelors', 'Masters', 'PhD']).optional(),
      yearsExperience: z.number().optional(),
      skills: z.array(z.string()).optional(),
      expectedSalarySGD: z.number().optional(),
      plan: z.enum(['freemium', 'standard', 'pro', 'ultimate']).optional()
    })
    .default({}),
  job: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      industry: z.string().optional(),
      salaryMinSGD: z.number().optional(),
      salaryMaxSGD: z.number().optional(),
      description: z.string().optional(),
      requirements: z.array(z.string()).optional(),
      employer: z
        .object({
          size: z.enum(['SME', 'MNC', 'Gov', 'Startup']),
          localHQ: z.boolean().optional(),
          diversityScore: z.number().optional()
        })
        .optional(),
      createdAt: z.string().optional()
    })
    .optional()
});

const applicationSchema = z.object({
  userId: z.string(),
  jobId: z.string()
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploadMaxMb * 1024 * 1024
  }
});

const RESUME_RATE_LIMITER = createRateLimiter({
  capacity: 10,
  refillIntervalMs: 60 * 60 * 1000
});

const ALLOWED_ORIGINS = new Set([config.webOrigin]);

function corsValidator(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return callback(null, true);
  if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
  callback(new Error('Origin not allowed by CORS'));
}

function parseProfileFromRequest(req: Request): Partial<User> {
  const headerProfile = req.header('x-ep-profile');
  if (headerProfile) {
    try {
      return JSON.parse(headerProfile);
    } catch {
      logger.warn('Failed to parse profile from header.');
    }
  }

  const queryProfile = req.query.profile;
  if (typeof queryProfile === 'string') {
    try {
      return JSON.parse(queryProfile);
    } catch {
      logger.warn('Failed to parse profile from query parameter.');
    }
  }

  return {
    educationLevel: 'Bachelors',
    skills: [],
    plan: 'freemium'
  } satisfies Partial<User>;
}

function handleError(error: unknown, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err: error, url: req.originalUrl }, 'Request failed');
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: 'upload_error', message: error.message });
    return;
  }

  if (error instanceof Error) {
    res.status(400).json({ error: 'bad_request', message: error.message });
    return;
  }

  res.status(500).json({ error: 'unknown', message: 'Unexpected server error' });
}

function inferPlanFromProfile(profile: Partial<User>): PlanTier {
  if (profile.plan && ['freemium', 'standard', 'pro', 'ultimate'].includes(profile.plan)) {
    return profile.plan;
  }
  return 'freemium';
}

function extractUser(input: Partial<User>): Partial<User> {
  const plan = inferPlanFromProfile(input);
  return {
    ...input,
    plan,
    skills: input.skills ?? []
  };
}

export async function buildServer(): Promise<express.Express> {
  const app = express();
  const storage: StorageAdapter = await createStorage();

  app.use(
    cors({
      origin: corsValidator,
      credentials: true
    })
  );
  app.use(express.json());

  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/plans', (_req, res) => {
    res.json({
      items: [
        { id: 'freemium', label: 'Freemium', price: 0, resumeAnalysis: false },
        { id: 'standard', label: 'Standard', price: 39, resumeAnalysis: true },
        { id: 'pro', label: 'Pro', price: 89, resumeAnalysis: true },
        { id: 'ultimate', label: 'Ultimate', price: 149, resumeAnalysis: true }
      ],
      gating: {
        resumeAnalysis: true,
        applications: true
      }
    });
  });

  router.get('/jobs', async (req, res, next) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined;
      const minSalary = req.query.minSalary ? Number.parseInt(req.query.minSalary as string, 10) : undefined;

      const filters = {
        limit,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        location: typeof req.query.location === 'string' ? req.query.location : undefined,
        industry: typeof req.query.industry === 'string' ? req.query.industry : undefined,
        minSalary
      };

      const user = extractUser(parseProfileFromRequest(req));
      const { items, total } = await storage.listJobs(filters);
      const withScores = items
        .map((job) => {
          const score = scoreCompass({ user, job });
          return {
            ...job,
            score: score.total,
            epIndicator: score.verdict
          };
        })
        .sort((a, b) => b.score - a.score);

      res.json({ items: withScores, total });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs/:id', async (req, res, next) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ error: 'not_found', message: 'Job not found' });
        return;
      }
      const user = extractUser(parseProfileFromRequest(req));
      const score = scoreCompass({ user, job });
      res.json({
        ...job,
        score: score.total,
        epIndicator: score.verdict,
        rationale: score.notes.slice(0, 4),
        breakdown: score.breakdown
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/assessments/compass', async (req, res, next) => {
    try {
      const payload = assessmentSchema.parse(req.body) as AssessmentInput;
      const score = scoreCompass(payload);
      res.json({ score });
    } catch (error) {
      next(error);
    }
  });

  router.post('/applications', async (req, res, next) => {
    try {
      const payload = applicationSchema.parse(req.body);
      const application = await storage.saveApplication(payload);
      res.status(201).json(application);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/resume/analyze',
    RESUME_RATE_LIMITER,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'missing_file', message: 'Resume file is required.' });
          return;
        }
        if (!isAllowedResumeMime(req.file.mimetype)) {
          res.status(400).json({ error: 'unsupported_type', message: 'Only PDF or DOCX resumes are supported.' });
          return;
        }

        let jobInput: AssessmentInput['job'];
        if (req.body?.jobId) {
          const job = await storage.getJob(req.body.jobId);
          if (job) {
            jobInput = job;
          }
        }

        const user = extractUser(parseProfileFromRequest(req));
        const { profile, score, tips } = await analyzeResume(req.file, { user, job: jobInput });
        res.json({ profile, score, tips });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/resume/llm_analyze',
    RESUME_RATE_LIMITER,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'missing_file', message: 'Resume file is required.' });
          return;
        }
        if (!isAllowedResumeMime(req.file.mimetype)) {
          res.status(400).json({ error: 'unsupported_type', message: 'Only PDF or DOCX resumes are supported.' });
          return;
        }

        let jobInput: AssessmentInput['job'];
        if (req.body?.jobId) {
          const job = await storage.getJob(req.body.jobId);
          if (job) {
            jobInput = job;
          }
        }

        const profile = await extract_resume_info(req.file);
        res.json({ profile });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/applications', async (_req, res, next) => {
    try {
      const applications = await storage.listApplications();
      res.json({ items: applications });
    } catch (error) {
      next(error);
    }
  });

  router.post('/hr/search', handleHRSearch);

  app.use('/api', router);
  app.use(handleError);

  return app;
}

export async function startServer(): Promise<void> {
  const app = await buildServer();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API listening');
  });

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.info({ signal }, 'Shutting down');
      server.close(() => process.exit(0));
    });
  });
}
