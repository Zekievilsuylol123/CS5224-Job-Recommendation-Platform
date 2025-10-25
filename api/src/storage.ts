import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Application, Job, JobFilters, User } from './types.js';
import { createSeedJobs } from './seedJobs.js';
import { config } from './config.js';
import { logger } from './logger.js';

export interface StorageAdapter {
  setup(): Promise<void>;
  listJobs(filters: JobFilters): Promise<{ items: Job[]; total: number }>;
  getJob(id: string): Promise<Job | undefined>;
  saveApplication(application: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Application>;
  listApplications(): Promise<Application[]>;
  saveUserProfile(user: User): Promise<User>;
  getUserProfile(userId: string): Promise<User | undefined>;
}

interface PersistedState {
  jobs: Job[];
  applications: Application[];
  users: User[];
}

function applyJobFilters(jobs: Job[], filters: JobFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const haystack = `${job.title} ${job.company} ${job.description} ${job.requirements.join(' ')}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (filters.location && job.location !== filters.location) return false;
    if (filters.industry && job.industry !== filters.industry) return false;
    if (filters.minSalary) {
      const salaryBand = job.salaryMaxSGD ?? job.salaryMinSGD ?? 0;
      if (salaryBand < filters.minSalary) return false;
    }
    return true;
  });
}

class InMemoryStore implements StorageAdapter {
  protected jobs: Job[] = [];
  protected applications: Application[] = [];
  protected users: Map<string, User> = new Map();

  async setup(): Promise<void> {
    this.jobs = createSeedJobs(config.seedJobsCount);
  }

  async listJobs(filters: JobFilters): Promise<{ items: Job[]; total: number }> {
    const filtered = applyJobFilters(this.jobs, filters);
    const limit = filters.limit ?? filtered.length;
    return {
      items: filtered.slice(0, limit),
      total: filtered.length
    };
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.find((job) => job.id === id);
  }

  async saveApplication(application: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Application> {
    const record: Application = {
      ...application,
      id: randomUUID(),
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.applications.push(record);
    return record;
  }

  async listApplications(): Promise<Application[]> {
    return [...this.applications];
  }

  async saveUserProfile(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async getUserProfile(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }
}

class FileStore extends InMemoryStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    super();
    this.filePath = filePath ?? resolve(process.cwd(), 'generated', 'api-store.json');
  }

  override async setup(): Promise<void> {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as PersistedState;
        this.jobs = parsed.jobs.length > 0 ? parsed.jobs : createSeedJobs(config.seedJobsCount);
        this.applications = parsed.applications ?? [];
        this.users = new Map((parsed.users ?? []).map((user) => [user.id, user]));
      } else {
        this.jobs = createSeedJobs(config.seedJobsCount);
        this.persist();
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize file store. Falling back to seed.');
      this.jobs = createSeedJobs(config.seedJobsCount);
    }
  }

  override async saveApplication(application: Omit<Application, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Application> {
    const record = await super.saveApplication(application);
    this.persist();
    return record;
  }

  override async saveUserProfile(user: User): Promise<User> {
    const saved = await super.saveUserProfile(user);
    this.persist();
    return saved;
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const payload: PersistedState = {
      jobs: this.jobs,
      applications: this.applications,
      users: [...this.users.values()]
    };
    writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
  }
}

export async function createStorage(): Promise<StorageAdapter> {
  const store = config.allowFileStore ? new FileStore() : new InMemoryStore();
  await store.setup();
  return store;
}
