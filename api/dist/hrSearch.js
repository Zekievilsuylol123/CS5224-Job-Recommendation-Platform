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
            const errorText = await response.text().catch(() => 'No error details');
            throw new Error(`HR search API returned ${response.status}: ${errorText}`);
        }
        // Check if response has content
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
            throw new Error('HR search API returned empty response');
        }
        let data;
        try {
            data = JSON.parse(responseText);
        }
        catch (parseError) {
            throw new Error(`HR search API returned invalid JSON: ${responseText.substring(0, 100)}`);
        }
        // Transform and filter the response to include only essential fields
        const allProspects = (data || []).map((prospect) => ({
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
        // Filter out invalid prospects (those with no useful data)
        const filteredProspects = allProspects.filter(prospect => {
            // A valid prospect should have at least a name or email or LinkedIn
            return (prospect.full_name.trim() !== '' ||
                prospect.first_name.trim() !== '' ||
                prospect.email !== null ||
                prospect.personal_email !== null ||
                prospect.linkedin.trim() !== '');
        });
        console.log(`Filtered ${allProspects.length - filteredProspects.length} invalid prospects out of ${allProspects.length} total`);
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
        console.error('Error in searchHRProspects:', error);
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
            const { data: cached, error: cacheError } = await supabaseAdmin
                .from('hr_contacts_cache')
                .select('*')
                .eq('company_domain', normalizedDomain)
                .maybeSingle();
            if (cacheError) {
                console.error('Error checking cache:', cacheError);
                // Continue to fetch fresh data
            }
            else if (cached) {
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
        // Only save to cache if we got valid prospects
        if (result.prospects.length > 0) {
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
        }
        else {
            console.log(`No valid prospects found for ${normalizedDomain}, not caching empty result`);
        }
        res.json({
            ...result,
            from_cache: false
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get cached HR contacts only (no external API call)
 */
export async function handleGetCachedHRContacts(req, res, next) {
    try {
        const { company_domain } = req.query;
        if (!company_domain || typeof company_domain !== 'string') {
            res.status(400).json({
                error: 'invalid_request',
                message: 'company_domain is required and must be a string'
            });
            return;
        }
        // Normalize domain
        const normalizedDomain = company_domain
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
        // Check cache - use maybeSingle() to avoid error when no row found
        const { data: cached, error: fetchError } = await supabaseAdmin
            .from('hr_contacts_cache')
            .select('*')
            .eq('company_domain', normalizedDomain)
            .maybeSingle();
        if (fetchError) {
            console.error('Error fetching cached HR contacts:', fetchError);
            res.status(500).json({
                error: 'database_error',
                message: 'Failed to fetch cached HR contacts'
            });
            return;
        }
        if (cached) {
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
        // No cached data
        res.json({
            prospects: [],
            company_domain: normalizedDomain,
            fetch_count: 0,
            file_name: '',
            timestamp: '',
            from_cache: false
        });
    }
    catch (error) {
        console.error('Unexpected error in getCachedHRContacts:', error);
        next(error);
    }
}
