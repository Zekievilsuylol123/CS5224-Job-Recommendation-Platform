import { logger } from '../logger.js';
const JOBS_API_URL = 'https://eaziym.github.io/sg-jobs/data/jobs.min.json';
let cachedJobs = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
/**
 * Fetch jobs from external API with caching
 */
export async function fetchExternalJobs() {
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
        const jobs = await response.json();
        // Normalize the job data
        cachedJobs = jobs.map((job, index) => {
            // Generate stable ID based on company, date, and index
            // Use a simple slug format without encoding to avoid URL issues
            const companySlug = job.c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const id = `ext-${companySlug}-${job.d}-${index}`;
            // Enhance tags based on job title
            const enhancedTags = [...(job.g || [])];
            const titleLower = job.t.toLowerCase();
            // Add Marketing tag if title contains marketing-related keywords
            if (titleLower.includes('marketing') ||
                titleLower.includes('brand') ||
                titleLower.includes('content') ||
                titleLower.includes('digital marketing') ||
                titleLower.includes('growth') ||
                titleLower.includes('seo') ||
                titleLower.includes('sem')) {
                if (!enhancedTags.includes('Marketing')) {
                    enhancedTags.push('Marketing');
                }
            }
            // Add "Others" tag if no specific category tags exist
            const hasSpecificTag = enhancedTags.some(tag => !['remote', 'hybrid', 'full-time', 'part-time', 'contract', 'internship'].includes(tag.toLowerCase()));
            if (!hasSpecificTag) {
                enhancedTags.push('Others');
            }
            return {
                id,
                title: job.t,
                company: job.c,
                location: job.m,
                url: job.u,
                date: job.d,
                tags: enhancedTags,
                industry: inferIndustry(enhancedTags)
            };
        });
        cacheTimestamp = now;
        logger.info(`Fetched and cached ${cachedJobs.length} jobs from external API`);
        return cachedJobs;
    }
    catch (error) {
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
function inferIndustry(tags) {
    const industryMap = {
        'Technology': 'Technology',
        'Finance': 'Finance',
        'Healthcare': 'Healthcare',
        'Consulting': 'Consulting',
        'Manufacturing': 'Manufacturing',
        'Logistics': 'Logistics',
        'Energy': 'Energy'
    };
    for (const tag of tags) {
        const industry = industryMap[tag];
        if (industry)
            return industry;
    }
    // Default to Technology if no industry found
    return 'Technology';
}
/**
 * Filter jobs based on criteria
 */
export function filterJobs(jobs, filters) {
    let filtered = [...jobs];
    // Search filter (title, company, or tags)
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(job => job.title.toLowerCase().includes(searchLower) ||
            job.company.toLowerCase().includes(searchLower) ||
            job.tags.some(tag => tag.toLowerCase().includes(searchLower)));
    }
    // Location filter
    if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        filtered = filtered.filter(job => job.location.toLowerCase().includes(locationLower));
    }
    // Industry filter
    if (filters.industry) {
        const industryLower = filters.industry.toLowerCase();
        filtered = filtered.filter(job => job.industry === industryLower ||
            job.tags.some(tag => tag.toLowerCase() === industryLower));
    }
    // Tags filter (supports multiple comma-separated tags)
    if (filters.tags) {
        const selectedTags = filters.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        if (selectedTags.length > 0) {
            filtered = filtered.filter(job => selectedTags.some(selectedTag => job.tags.some(tag => tag.toLowerCase() === selectedTag)));
        }
    }
    // Company filter (supports multiple comma-separated companies)
    if (filters.company) {
        const selectedCompanies = filters.company.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
        if (selectedCompanies.length > 0) {
            filtered = filtered.filter(job => selectedCompanies.some(selectedCompany => job.company.toLowerCase() === selectedCompany));
        }
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
export function clearJobsCache() {
    cachedJobs = null;
    cacheTimestamp = 0;
    logger.info('Jobs cache cleared');
}
