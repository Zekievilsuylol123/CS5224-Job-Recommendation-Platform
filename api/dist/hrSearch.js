import { supabaseAdmin } from './supabase.js';
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
        contact_job_title: ['hr', 'human resource', 'talent acquisition', 'recruiter', 'hiring manager'],
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
 * Express route handler for HR prospect search with caching
 */
export async function handleHRSearch(req, res, next) {
    try {
        const { company_domain, force_refresh } = req.body;
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
        // Normalize domain
        const normalizedDomain = company_domain
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
        // Check cache first (unless force_refresh is true)
        if (!force_refresh) {
            const { data: cached } = await supabaseAdmin
                .from('hr_contacts_cache')
                .select('*')
                .eq('company_domain', normalizedDomain)
                .single();
            if (cached) {
                // Increment search count
                await supabaseAdmin
                    .from('hr_contacts_cache')
                    .update({
                    search_count: (cached.search_count || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', cached.id);
                res.json({
                    prospects: cached.prospects,
                    company_domain: cached.company_domain,
                    fetch_count: cached.prospects.length,
                    file_name: `Cached_${cached.company_name || normalizedDomain}`,
                    timestamp: cached.updated_at,
                    from_cache: true
                });
                return;
            }
        }
        // Fetch fresh data
        const fetchCount = req.body.fetch_count || 3;
        const result = await searchHRProspects(company_domain, fetchCount);
        // Save to cache
        const companyName = result.prospects[0]?.company_name || normalizedDomain;
        await supabaseAdmin
            .from('hr_contacts_cache')
            .upsert({
            company_domain: normalizedDomain,
            company_name: companyName,
            prospects: result.prospects,
            fetched_by_user_id: req.user?.id || null,
            search_count: 1
        }, {
            onConflict: 'company_domain'
        });
        res.json({
            ...result,
            from_cache: false
        });
    }
    catch (error) {
        next(error);
    }
}
