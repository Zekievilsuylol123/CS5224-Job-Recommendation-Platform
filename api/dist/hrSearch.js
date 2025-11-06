/**
 * Search for HR/recruiter contacts at a specific company
 * @param companyDomain - Company website domain (e.g., "okx.com" or "https://okx.com/")
 * @param fetchCount - Number of prospects to fetch (default: 2)
 * @returns Promise with list of HR prospects
 */
export async function searchHRProspects(companyDomain, fetchCount = 2) {
    // Normalize domain (remove protocol and trailing slash)
    const normalizedDomain = companyDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
    // Generate file name with current timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]; // Format: YYYY-MM-DDTHH-MM-SS
    const fileName = `Prospects_${timestamp}`;
    // Prepare payload for external API
    const payload = {
        company_domain: [companyDomain],
        company_industry: [],
        company_keywords: [],
        company_not_industry: [],
        company_not_keywords: [],
        contact_job_title: ['hr', 'human resource', 'talent acquisition', 'recruiter'],
        contact_location: ['singapore'],
        contact_not_job_title: ['product manager'],
        contact_not_location: ['united states'],
        email_status: ['validated', 'not_validated', 'unknown'],
        fetch_count: fetchCount,
        seniority_level: ['senior', 'entry', 'manager'],
        file_name: fileName
    };
    try {
        const response = await fetch('https://n8n.shiyao.dev/webhook/hrsearch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`HR search API returned ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Transform and filter the response to include only essential fields
        const filteredProspects = (data || []).map((prospect) => ({
            first_name: prospect.first_name || '',
            last_name: prospect.last_name || '',
            full_name: prospect.full_name || '',
            email: prospect.email || null,
            personal_email: prospect.personal_email || null,
            job_title: prospect.job_title || '',
            linkedin: prospect.linkedin || '',
            company_name: prospect.company_name || '',
            company_domain: prospect.company_domain || '',
            city: prospect.city || '',
            country: prospect.country || ''
        }));
        // Transform the response to our format
        return {
            prospects: filteredProspects,
            company_domain: normalizedDomain,
            fetch_count: fetchCount,
            file_name: fileName,
            timestamp: now.toISOString()
        };
    }
    catch (error) {
        throw new Error(`Failed to search HR prospects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Express route handler for HR prospect search
 */
export async function handleHRSearch(req, res, next) {
    try {
        const { company_domain } = req.body;
        if (!company_domain || typeof company_domain !== 'string') {
            res.status(400).json({
                error: 'invalid_request',
                message: 'company_domain is required and must be a string'
            });
            return;
        }
        // Optional: validate domain format
        const domainRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!domainRegex.test(company_domain)) {
            res.status(400).json({
                error: 'invalid_domain',
                message: 'Invalid company domain format'
            });
            return;
        }
        const fetchCount = req.body.fetch_count || 2;
        const result = await searchHRProspects(company_domain, fetchCount);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
