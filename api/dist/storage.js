import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createSeedJobs } from './seedJobs.js';
import { config } from './config.js';
import { logger } from './logger.js';
function applyJobFilters(jobs, filters) {
    return jobs.filter((job) => {
        if (filters.search) {
            const term = filters.search.toLowerCase();
            const haystack = `${job.title} ${job.company} ${job.description} ${job.requirements.join(' ')}`.toLowerCase();
            if (!haystack.includes(term))
                return false;
        }
        if (filters.location && job.location !== filters.location)
            return false;
        if (filters.industry && job.industry !== filters.industry)
            return false;
        if (filters.minSalary) {
            const salaryBand = job.salaryMaxSGD ?? job.salaryMinSGD ?? 0;
            if (salaryBand < filters.minSalary)
                return false;
        }
        return true;
    });
}
class InMemoryStore {
    constructor() {
        this.jobs = [];
        this.applications = [];
        this.users = new Map();
    }
    async setup() {
        this.jobs = createSeedJobs(config.seedJobsCount);
    }
    async listJobs(filters) {
        const filtered = applyJobFilters(this.jobs, filters);
        const limit = filters.limit ?? filtered.length;
        return {
            items: filtered.slice(0, limit),
            total: filtered.length
        };
    }
    async getJob(id) {
        return this.jobs.find((job) => job.id === id);
    }
    async saveApplication(application) {
        const record = {
            ...application,
            id: randomUUID(),
            status: 'sent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.applications.push(record);
        return record;
    }
    async listApplications() {
        return [...this.applications];
    }
    async saveUserProfile(user) {
        this.users.set(user.id, user);
        return user;
    }
    async getUserProfile(userId) {
        return this.users.get(userId);
    }
}
class FileStore extends InMemoryStore {
    constructor(filePath) {
        super();
        this.filePath = filePath ?? resolve(process.cwd(), 'generated', 'api-store.json');
    }
    async setup() {
        try {
            if (existsSync(this.filePath)) {
                const raw = readFileSync(this.filePath, 'utf8');
                const parsed = JSON.parse(raw);
                this.jobs = parsed.jobs.length > 0 ? parsed.jobs : createSeedJobs(config.seedJobsCount);
                this.applications = parsed.applications ?? [];
                this.users = new Map((parsed.users ?? []).map((user) => [user.id, user]));
            }
            else {
                this.jobs = createSeedJobs(config.seedJobsCount);
                this.persist();
            }
        }
        catch (error) {
            logger.error({ err: error }, 'Failed to initialize file store. Falling back to seed.');
            this.jobs = createSeedJobs(config.seedJobsCount);
        }
    }
    async saveApplication(application) {
        const record = await super.saveApplication(application);
        this.persist();
        return record;
    }
    async saveUserProfile(user) {
        const saved = await super.saveUserProfile(user);
        this.persist();
        return saved;
    }
    persist() {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const payload = {
            jobs: this.jobs,
            applications: this.applications,
            users: [...this.users.values()]
        };
        writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
    }
}
export async function createStorage() {
    const store = config.allowFileStore ? new FileStore() : new InMemoryStore();
    await store.setup();
    return store;
}
