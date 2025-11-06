import { logger } from '../logger.js';

export interface ExternalJob {
  c: string; // company
  t: string; // title
  u: string; // url
  m: string; // location
  d: string; // date
  g: string[]; // tags (genres/categories)
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

/**
 * Fetch jobs from external API with caching
 */
export async function fetchExternalJobs(): Promise<NormalizedJob[]> {
  const now = Date.now();
  
  // Return cached jobs if still valid
  if (cachedJobs && (now - cacheTimestamp) < CACHE_TTL) {
    logger.debug(`Returning ${cachedJobs.length} cached jobs`);
    return cachedJobs;
  }

  try {
    logger.info('Fetching jobs from external API');
    const response = await fetch(JOBS_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    }
    
    const jobs: ExternalJob[] = await response.json();
    
    // Normalize the job data
    cachedJobs = jobs.map((job, index) => {
      // Generate stable ID based on company, date, and index
      // Use a simple slug format without encoding to avoid URL issues
      const companySlug = job.c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const id = `ext-${companySlug}-${job.d}-${index}`;
      
      return {
        id,
        title: job.t,
        company: job.c,
        location: job.m,
        url: job.u,
        date: job.d,
        tags: job.g || [],
        industry: inferIndustry(job.g || [])
      };
    });
    
    cacheTimestamp = now;
    logger.info(`Fetched and cached ${cachedJobs.length} jobs from external API`);
    
    return cachedJobs;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch external jobs');
    
    // Return stale cache if available, otherwise empty array
    if (cachedJobs) {
      logger.warn('Returning stale cached jobs due to fetch error');
      return cachedJobs;
    }
    
    return [];
  }
}

/**
 * Infer industry from job tags
 */
function inferIndustry(tags: string[]): string | undefined {
  const industryMap: Record<string, string> = {
    'Technology': 'technology',
    'Finance': 'finance',
    'Healthcare': 'healthcare',
    'Consulting': 'professional services',
    'Manufacturing': 'manufacturing',
    'Logistics': 'logistics',
    'Energy': 'energy'
  };
  
  for (const tag of tags) {
    const industry = industryMap[tag];
    if (industry) return industry;
  }
  
  return undefined;
}

/**
 * Filter jobs based on criteria
 */
export function filterJobs(
  jobs: NormalizedJob[],
  filters: {
    search?: string;
    location?: string;
    industry?: string;
    tags?: string;
    company?: string;
    limit?: number;
  }
): NormalizedJob[] {
  let filtered = [...jobs];

  // Search filter (title, company, or tags)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      job =>
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Location filter
  if (filters.location) {
    const locationLower = filters.location.toLowerCase();
    filtered = filtered.filter(job =>
      job.location.toLowerCase().includes(locationLower)
    );
  }

  // Industry filter
  if (filters.industry) {
    const industryLower = filters.industry.toLowerCase();
    filtered = filtered.filter(job =>
      job.industry === industryLower ||
      job.tags.some(tag => tag.toLowerCase() === industryLower)
    );
  }

  // Tags filter
  if (filters.tags) {
    const tagLower = filters.tags.toLowerCase();
    filtered = filtered.filter(job =>
      job.tags.some(tag => tag.toLowerCase() === tagLower)
    );
  }

  // Company filter
  if (filters.company) {
    const companyLower = filters.company.toLowerCase();
    filtered = filtered.filter(job =>
      job.company.toLowerCase() === companyLower
    );
  }

  // Limit results
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearJobsCache(): void {
  cachedJobs = null;
  cacheTimestamp = 0;
  logger.info('Jobs cache cleared');
}
