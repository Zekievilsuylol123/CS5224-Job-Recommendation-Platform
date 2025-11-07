# User Journey Implementation Plan

## Overview
Complete user journey from login → resume upload → parsing → compass scoring → job matching → job details → fit assessment

## Current State Analysis

### ✅ What's Working
- Authentication flow with Supabase (Google OAuth)
- Resume upload UI
- Basic compass scoring logic (rule-based)
- Job listing and detail pages
- Frontend components for score display

### ❌ What Needs Changes

#### 1. Resume Parsing
- **Current**: Uses hardcoded `analyzeResume()` function
- **Required**: Switch to LLM-based `extract_resume_info()`
- **Impact**: More accurate parsing of diverse resume formats

#### 2. Compass Scoring
- **Current**: Rule-based `scoreCompass()` 
- **Required**: Create LLM-enhanced version for better reasoning
- **Approach**: Hybrid - use rules for quantifiable metrics, LLM for qualitative assessment

#### 3. Job Data Source
- **Current**: Seeded/mock jobs
- **Required**: Real-time jobs from `https://eaziym.github.io/sg-jobs/data/jobs.min.json`
- **Format**: `{c: company, t: title, u: url, m: location, d: date, g: [tags]}`

#### 4. EP Flag Calculation
- **Current**: Calculated per request in memory
- **Required**: Decision on real-time vs cached approach
- **Recommendation**: Real-time calculation with caching layer

#### 5. Database Schema
- **Current**: In-memory storage adapter
- **Required**: Supabase tables for persistent user profiles

---

## Implementation Steps

### Phase 1: Database Schema (Supabase)

#### Tables to Create

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gender TEXT,
  nationality TEXT,
  education_level TEXT CHECK (education_level IN ('Diploma', 'Bachelors', 'Masters', 'PhD')),
  education_institution TEXT,
  certifications TEXT[], -- Array of certification names
  years_experience INTEGER,
  skills TEXT[], -- Array of skill names
  expected_salary_sgd INTEGER,
  plan TEXT CHECK (plan IN ('freemium', 'standard', 'pro', 'ultimate')) DEFAULT 'freemium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Saved jobs (user job matching cache)
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_external_id TEXT NOT NULL, -- From external API
  job_title TEXT NOT NULL,
  job_company TEXT NOT NULL,
  job_url TEXT,
  job_location TEXT,
  job_date TEXT,
  job_tags TEXT[],
  compass_score INTEGER, -- Cached score
  ep_verdict TEXT CHECK (ep_verdict IN ('Likely', 'Borderline', 'Unlikely')),
  score_breakdown JSONB, -- Cached breakdown
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_external_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved jobs"
  ON saved_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON saved_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved jobs"
  ON saved_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Applications tracking
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_external_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_company TEXT NOT NULL,
  job_url TEXT,
  status TEXT CHECK (status IN ('draft', 'sent', 'responded', 'rejected', 'interview')) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id);

-- Resume analysis history
CREATE TABLE resume_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  parsed_data JSONB NOT NULL, -- Store extracted profile
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their resume analyses"
  ON resume_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create resume analyses"
  ON resume_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Indexes
```sql
CREATE INDEX idx_profiles_user_id ON profiles(id);
CREATE INDEX idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_resume_analyses_user_id ON resume_analyses(user_id);
```

---

### Phase 2: Backend API Updates

#### 2.1 Add Supabase Service Client

**File**: `api/src/supabase.ts` (NEW)

```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Service role client for backend operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NOT the anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper to verify JWT from frontend
export async function verifyUser(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user;
}
```

#### 2.2 Authentication Middleware

**File**: `api/src/middleware/auth.ts` (NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyUser } from '../supabase.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing authorization header' });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const user = await verifyUser(token);
    req.user = user; // Attach to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid token' });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}
```

#### 2.3 Profile CRUD Endpoints

**Add to**: `api/src/server.ts`

```typescript
// Get current user profile
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    res.json(data || null);
  } catch (error) {
    next(error);
  }
});

// Create or update profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const profileData = {
      id: req.user!.id,
      name: req.body.name,
      gender: req.body.gender,
      nationality: req.body.nationality,
      education_level: req.body.educationLevel,
      education_institution: req.body.educationInstitution,
      certifications: req.body.certifications,
      years_experience: req.body.yearsExperience,
      skills: req.body.skills,
      expected_salary_sgd: req.body.expectedSalarySGD,
      plan: req.body.plan,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});
```

#### 2.4 Switch Resume Parsing to LLM

**Update**: `api/src/server.ts` resume analyze endpoint

```typescript
// Replace existing /resume/analyze endpoint
router.post(
  '/resume/analyze',
  requireAuth, // Now requires authentication
  RESUME_RATE_LIMITER,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'missing_file', message: 'Resume file is required.' });
        return;
      }

      if (!isAllowedResumeMime(req.file.mimetype)) {
        res.status(400).json({ error: 'invalid_type', message: 'Only PDF and DOCX files are allowed.' });
        return;
      }

      // Use LLM-based extraction instead of hardcoded function
      const parsedProfile = await extract_resume_info(req.file.buffer, req.file.mimetype);

      // Save analysis to database
      await supabaseAdmin.from('resume_analyses').insert({
        user_id: req.user!.id,
        file_name: req.file.originalname,
        parsed_data: parsedProfile
      });

      res.json({ profile: parsedProfile });
    } catch (error) {
      next(error);
    }
  }
);
```

#### 2.5 External Jobs API Integration

**File**: `api/src/jobs/external.ts` (NEW)

```typescript
import { logger } from '../logger.js';

export interface ExternalJob {
  c: string; // company
  t: string; // title
  u: string; // url
  m: string; // location
  d: string; // date
  g: string[]; // tags
}

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  date: string;
  tags: string[];
  industry?: string;
}

const JOBS_API_URL = 'https://eaziym.github.io/sg-jobs/data/jobs.min.json';
let cachedJobs: NormalizedJob[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchExternalJobs(): Promise<NormalizedJob[]> {
  const now = Date.now();
  
  // Return cached jobs if still valid
  if (cachedJobs && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedJobs;
  }

  try {
    const response = await fetch(JOBS_API_URL);
    if (!response.ok) throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    
    const jobs: ExternalJob[] = await response.json();
    
    cachedJobs = jobs.map((job, index) => ({
      id: `ext-${job.c}-${index}-${job.d}`, // Generate stable ID
      title: job.t,
      company: job.c,
      location: job.m,
      url: job.u,
      date: job.d,
      tags: job.g,
      industry: inferIndustry(job.g)
    }));
    
    cacheTimestamp = now;
    logger.info(`Fetched ${cachedJobs.length} jobs from external API`);
    
    return cachedJobs;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch external jobs');
    return cachedJobs || []; // Return stale cache if available
  }
}

function inferIndustry(tags: string[]): string | undefined {
  const industryMap: Record<string, string> = {
    'Technology': 'technology',
    'Finance': 'finance',
    'Healthcare': 'healthcare',
    'Consulting': 'professional services'
  };
  
  for (const tag of tags) {
    if (industryMap[tag]) return industryMap[tag];
  }
  return undefined;
}

export function filterJobs(
  jobs: NormalizedJob[],
  filters: {
    search?: string;
    location?: string;
    industry?: string;
    limit?: number;
  }
): NormalizedJob[] {
  let filtered = jobs;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      job =>
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (filters.location) {
    filtered = filtered.filter(job =>
      job.location.toLowerCase().includes(filters.location!.toLowerCase())
    );
  }

  if (filters.industry) {
    filtered = filtered.filter(job =>
      job.industry === filters.industry ||
      job.tags.some(tag => tag.toLowerCase() === filters.industry!.toLowerCase())
    );
  }

  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}
```

#### 2.6 Update Jobs Endpoints to Use External API

**Update**: `api/src/server.ts`

```typescript
import { fetchExternalJobs, filterJobs } from './jobs/external.js';

router.get('/jobs', requireAuth, async (req, res, next) => {
  try {
    const externalJobs = await fetchExternalJobs();
    const filtered = filterJobs(externalJobs, {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      location: typeof req.query.location === 'string' ? req.query.location : undefined,
      industry: typeof req.query.industry === 'string' ? req.query.industry : undefined,
      limit: req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50
    });

    // Get user profile for scoring
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    // Calculate compass scores
    const withScores = filtered.map(job => {
      const score = scoreCompass({
        user: profile || {},
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          industry: job.industry,
          requirements: job.tags // Use tags as requirements
        }
      });

      return {
        ...job,
        score: score.total,
        epIndicator: score.verdict
      };
    }).sort((a, b) => b.score - a.score);

    res.json({ items: withScores, total: filtered.length });
  } catch (error) {
    next(error);
  }
});

router.get('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const externalJobs = await fetchExternalJobs();
    const job = externalJobs.find(j => j.id === req.params.id);
    
    if (!job) {
      res.status(404).json({ error: 'not_found', message: 'Job not found' });
      return;
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    const score = scoreCompass({
      user: profile || {},
      job: {
        title: job.title,
        company: job.company,
        location: job.location,
        industry: job.industry,
        requirements: job.tags
      }
    });

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
```

#### 2.7 LLM-Enhanced Compass Scoring (Optional Enhancement)

**File**: `api/src/resume/llm_compass.ts` (NEW)

```typescript
import OpenAI from 'openai';
import { scoreCompass } from '../scoreCompass.js';
import type { AssessmentInput, CompassScore } from '../types.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function scoreCompassWithLLM(input: AssessmentInput): Promise<CompassScore> {
  // First get rule-based score
  const ruleScore = scoreCompass(input);

  // Use LLM to enhance with qualitative reasoning
  const prompt = `
You are an expert on Singapore's Employment Pass (EP) criteria. Given the following candidate and job match:

**Candidate Profile:**
- Education: ${input.user.educationLevel || 'Not specified'} from ${input.user.educationInstitution || 'Unknown'}
- Experience: ${input.user.yearsExperience || 0} years
- Skills: ${input.user.skills?.join(', ') || 'None listed'}
- Expected Salary: SGD ${input.user.expectedSalarySGD || 'Not specified'}
- Certifications: ${input.user.certifications?.join(', ') || 'None'}

**Job Details:**
- Title: ${input.job?.title || 'Not specified'}
- Company: ${input.job?.company || 'Not specified'}
- Industry: ${input.job?.industry || 'Not specified'}
- Requirements: ${input.job?.requirements?.join(', ') || 'Not specified'}

**Rule-based Score:** ${ruleScore.total}% (${ruleScore.verdict})

**Breakdown:**
${ruleScore.notes.join('\n')}

Based on EP criteria (salary benchmarks, qualifications, skills match, shortage occupations), provide:
1. A qualitative assessment of EP likelihood (2-3 sentences)
2. Top 3 strengths for EP application
3. Top 2 areas for improvement

Be specific and actionable.
`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert consultant on Singapore Employment Pass applications with deep knowledge of MOM criteria.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const llmAnalysis = completion.choices[0].message.content || '';

    // Return enhanced score with LLM insights
    return {
      ...ruleScore,
      notes: [...ruleScore.notes, '\n--- LLM Analysis ---', llmAnalysis]
    };
  } catch (error) {
    console.error('LLM enhancement failed, returning rule-based score', error);
    return ruleScore; // Fallback to rule-based
  }
}
```

**Add endpoint**: `api/src/server.ts`

```typescript
router.post('/assessments/compass-llm', requireAuth, async (req, res, next) => {
  try {
    const payload = assessmentSchema.parse(req.body) as AssessmentInput;
    const score = await scoreCompassWithLLM(payload);
    res.json({ score });
  } catch (error) {
    next(error);
  }
});
```

---

### Phase 3: Frontend Updates

#### 3.1 API Client Updates

**Update**: `web/src/api/client.ts`

Add authentication headers:

```typescript
import { supabase } from '../lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export async function fetchJobs(filters: JobFilters = {}) {
  const headers = await getAuthHeaders();
  // ... rest of fetch logic
}

// Update all API calls to include auth headers
```

#### 3.2 Profile Store Integration with Supabase

**Update**: `web/src/store/profile.ts`

```typescript
import { supabase } from '../lib/supabase';

// Add methods to sync with Supabase
export const useProfileStore = create<ProfileState>((set, get) => ({
  // ... existing state ...

  async loadProfileFromDB() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const response = await fetch(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    if (response.ok) {
      const profile = await response.json();
      set({ profile });
    }
  },

  async saveProfileToDB() {
    const { profile } = get();
    if (!profile) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(profile)
    });
  }
}));
```

#### 3.3 Update Assessment Page Flow

**Update**: `web/src/pages/SelfAssessment.tsx`

- Call `extract_resume_info` endpoint (already does this)
- Auto-save to Supabase after parsing
- Show edit form
- Recalculate compass score on demand
- Provide "See Matched Jobs" button

```typescript
// After resume parsing succeeds
const handleResumeSuccess = async (parsed: ParsedProfile) => {
  const merged = mergeProfile(draftProfile, parsed);
  setDraftProfile(merged);
  
  // Save to Supabase immediately
  await useProfileStore.getState().saveProfileToDB();
  
  // Calculate initial compass score
  const { score } = await assessCompass({ user: merged });
  setCompassScore(score);
};

// Recalculate button
const handleRecalculate = async () => {
  const { score } = await assessCompass({ user: draftProfile });
  setCompassScore(score);
};

// Navigate to jobs
const handleSeeJobs = () => {
  navigate('/jobs');
};
```

---

### Phase 4: Job Detail Enhancements

#### 4.1 Mock JD for "Assess Fit" Feature

**File**: `api/src/jobs/mockJDs.ts` (NEW)

```typescript
export const MOCK_JOB_DESCRIPTIONS: Record<string, string> = {
  'software-engineer': `
**Responsibilities:**
- Design and develop scalable backend services
- Write clean, maintainable code in TypeScript/Node.js
- Collaborate with cross-functional teams
- Participate in code reviews and mentoring

**Requirements:**
- 3+ years experience in software development
- Strong proficiency in TypeScript, Node.js, React
- Experience with cloud platforms (AWS/GCP/Azure)
- Bachelor's degree in Computer Science or related field
`,
  'data-scientist': `
**Responsibilities:**
- Build predictive models and ML pipelines
- Analyze large datasets to derive insights
- Deploy models to production
- Present findings to stakeholders

**Requirements:**
- Master's degree in Data Science, Statistics, or related field
- 4+ years experience with Python, SQL, ML frameworks
- Experience with cloud ML platforms
- Strong communication skills
`,
  'product-manager': `
**Responsibilities:**
- Define product vision and roadmap
- Gather and prioritize requirements
- Work with engineering and design teams
- Launch and iterate on products

**Requirements:**
- 5+ years product management experience
- Experience in B2B SaaS preferred
- Strong analytical and communication skills
- Bachelor's degree required, MBA preferred
`
};

export function getMatchingJD(jobTitle: string): string {
  const titleLower = jobTitle.toLowerCase();
  
  if (titleLower.includes('data') || titleLower.includes('scientist') || titleLower.includes('analytics')) {
    return MOCK_JOB_DESCRIPTIONS['data-scientist'];
  }
  
  if (titleLower.includes('product') || titleLower.includes('manager') || titleLower.includes('pm')) {
    return MOCK_JOB_DESCRIPTIONS['product-manager'];
  }
  
  // Default to software engineer
  return MOCK_JOB_DESCRIPTIONS['software-engineer'];
}
```

#### 4.2 Enhance Job Detail Endpoint

**Update**: `api/src/server.ts`

```typescript
router.post('/jobs/:id/analyze', requireAuth, async (req, res, next) => {
  try {
    const externalJobs = await fetchExternalJobs();
    const job = externalJobs.find(j => j.id === req.params.id);
    
    if (!job) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (!profile) {
      res.status(400).json({ error: 'missing_profile' });
      return;
    }

    // Get mock JD
    const jobDescription = getMatchingJD(job.title);

    // Use LLM scorer to analyze fit
    const result = await get_score(profile, {
      title: job.title,
      description: jobDescription,
      requirements: job.tags
    });

    res.json({
      score: result.score,
      recommendations: result.recommendations,
      strengths: result.strengths,
      gaps: result.gaps
    });
  } catch (error) {
    next(error);
  }
});
```

---

## EP Flag Calculation Strategy

### Recommended Approach: **Hybrid Real-time + Caching**

#### Option 1: Real-time (Current)
- ✅ Always up-to-date with latest profile
- ✅ No stale data
- ❌ Slower for large job lists
- ❌ More compute

#### Option 2: Cached with TTL
- ✅ Faster job list rendering
- ✅ Reduced compute
- ❌ Can show stale scores
- ❌ Cache invalidation complexity

#### **Recommended: Hybrid**
1. **Job List Page**: Use cached scores (1 hour TTL)
2. **Job Detail Page**: Real-time recalculation
3. **"Assess Fit" Button**: Fresh LLM analysis

Implementation:
```typescript
// In jobs list endpoint
const cached = await supabaseAdmin
  .from('saved_jobs')
  .select('job_external_id, compass_score, ep_verdict')
  .eq('user_id', req.user!.id)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // 1 hour

const cachedMap = new Map(cached.data?.map(c => [c.job_external_id, c]) || []);

const withScores = filtered.map(job => {
  const cachedScore = cachedMap.get(job.id);
  
  if (cachedScore) {
    return { ...job, score: cachedScore.compass_score, epIndicator: cachedScore.ep_verdict };
  }
  
  // Calculate fresh
  const score = scoreCompass({ user: profile, job });
  
  // Cache it (fire and forget)
  supabaseAdmin.from('saved_jobs').upsert({
    user_id: req.user!.id,
    job_external_id: job.id,
    compass_score: score.total,
    ep_verdict: score.verdict,
    score_breakdown: score.breakdown
  }).then();
  
  return { ...job, score: score.total, epIndicator: score.verdict };
});
```

---

## Summary of Changes

### Backend (API)
1. ✅ Add Supabase client and auth middleware
2. ✅ Create profile CRUD endpoints
3. ✅ Switch resume parsing to LLM (`extract_resume_info`)
4. ✅ Integrate external jobs API
5. ✅ Update jobs endpoints to use external data
6. ✅ Add LLM-enhanced compass scoring (optional)
7. ✅ Add job fit analysis endpoint with mock JDs

### Frontend (Web)
1. ✅ Add auth headers to all API calls
2. ✅ Integrate profile store with Supabase
3. ✅ Update assessment page flow (parse → save → edit → score → jobs)
4. ✅ Add "Recalculate" and "See Matched Jobs" buttons
5. ✅ Update job detail page to show breakdown
6. ✅ Add "Assess Fit Against JD" feature

### Database (Supabase)
1. ✅ Create `profiles` table
2. ✅ Create `saved_jobs` table (for caching)
3. ✅ Create `applications` table
4. ✅ Create `resume_analyses` table
5. ✅ Set up RLS policies

---

## Implementation Order

1. **Database first**: Create Supabase tables (15 min)
2. **Backend auth**: Add middleware and profile endpoints (30 min)
3. **Resume parsing**: Switch to LLM (10 min)
4. **Jobs API**: Integrate external API (30 min)
5. **Frontend updates**: Auth headers, profile sync (20 min)
6. **Assessment flow**: Complete user journey (30 min)
7. **Job details**: Add fit analysis (20 min)
8. **Testing**: End-to-end flow (30 min)

**Total estimated time: ~3 hours**

---

## Testing Checklist

- [ ] User can log in with Google
- [ ] User can upload resume
- [ ] Resume is parsed with LLM
- [ ] Parsed data appears in form
- [ ] User can edit fields
- [ ] Compass score calculates correctly
- [ ] Profile saves to Supabase
- [ ] "See Matched Jobs" navigates to jobs list
- [ ] Jobs list shows real-time jobs with EP flags
- [ ] Job detail shows compass breakdown
- [ ] "Assess Fit" generates LLM analysis
- [ ] Applications can be created
- [ ] Profile persists across sessions
