import { logger } from '../logger.js';
// Company name to webhook mapping
const COMPANY_WEBHOOKS = {
    'grab': 'grab-jd',
    'jpmorgan': 'jpmorganchase-jd',
    'jpmorgan chase': 'jpmorganchase-jd',
    'morgan stanley': 'morganstanley-jd',
    'apple': 'apple-jd',
    'accenture': 'accenture-jd',
    'agoda': 'agoda-jd',
    'google': 'google-jd',
    'globalfoundries': 'globalfoundries-jd',
    'deloitte': 'deloitte-jd',
    'kpmg': 'kpmg-jd',
    'pwc': 'pwc-jd',
    'ey': 'ey-jd',
    'amazon': 'amazon-jd',
    'bytedance': 'bytedance-jd',
    'tencent': 'tencent-jd',
    'mckinsey': 'mckinsey-jd',
    'hsbc': 'hsbc-jd',
    'ocbc': 'ocbc-jd',
    'uob': 'uob-jd',
    'okx': 'okx-jd',
    'coinbase': 'coinbase-jd',
    'jump trading': 'jumptrading-jd',
    'db': 'db-jd',
    'deutsche bank': 'db-jd',
    'gs': 'gs-jd',
    'goldman sachs': 'gs-jd',
    'micron': 'micron-jd'
};
const WEBHOOK_BASE_URL = 'https://n8n.shiyao.dev/webhook';
const JD_CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
/**
 * Get the webhook name for a company
 */
function getWebhookName(company) {
    const normalizedCompany = company.toLowerCase().trim();
    // Check direct match
    if (COMPANY_WEBHOOKS[normalizedCompany]) {
        return COMPANY_WEBHOOKS[normalizedCompany];
    }
    // Check if company name contains any of our keys
    for (const [key, webhook] of Object.entries(COMPANY_WEBHOOKS)) {
        if (normalizedCompany.includes(key)) {
            return webhook;
        }
    }
    // Default to InternSG for other companies
    return 'internsg-jd';
}
/**
 * Fetch job description from webhook
 */
export async function fetchJobDescription(jobUrl, company) {
    const cacheKey = `${company}-${jobUrl}`;
    // Check cache first
    const cached = JD_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        logger.debug({ company, url: jobUrl }, 'Returning cached JD');
        return cached.data;
    }
    try {
        const webhookName = getWebhookName(company);
        // Properly encode the URL parameter
        const encodedUrl = encodeURIComponent(jobUrl);
        const webhookUrl = `${WEBHOOK_BASE_URL}/${webhookName}?url=${encodedUrl}`;
        logger.info({ company, webhookName, jobUrl }, 'Fetching JD from webhook');
        const response = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            logger.warn({ status: response.status, company, jobUrl }, 'Failed to fetch JD from webhook');
            return null;
        }
        const data = (await response.json());
        if (!data || data.length === 0) {
            logger.warn({ company, jobUrl }, 'No JD data returned from webhook');
            return null;
        }
        const jdData = data[0]; // Take the first result
        // Cache the result
        JD_CACHE.set(cacheKey, { data: jdData, timestamp: Date.now() });
        logger.info({ company, title: jdData.title }, 'Successfully fetched JD');
        return jdData;
    }
    catch (error) {
        logger.error({ err: error, company, jobUrl }, 'Error fetching JD from webhook');
        return null;
    }
}
/**
 * Check if a company is from InternSG (smaller companies)
 */
export function isInternSGCompany(company) {
    const normalizedCompany = company.toLowerCase().trim();
    return !Object.keys(COMPANY_WEBHOOKS).some(key => normalizedCompany === key || normalizedCompany.includes(key));
}
/**
 * Clear the JD cache (useful for testing or manual refresh)
 */
export function clearJDCache() {
    JD_CACHE.clear();
    logger.info('JD cache cleared');
}
