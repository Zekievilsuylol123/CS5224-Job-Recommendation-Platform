import OpenAI from 'openai';
import { supabaseAdmin } from './supabase.js';
import { fetchExternalJobs } from './jobs/external.js';
import { fetchJobDescription } from './jobs/jdFetcher.js';
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
/**
 * Generate a professional, polite, and tailored HR outreach message using LLM
 */
export async function generateOutreachMessage(input) {
    const system_prompt = `You are an expert career advisor helping job seekers craft professional, polite, and effective outreach messages to HR professionals.

Your messages should:
1. Be concise (200-250 words)
2. Show genuine interest in the SPECIFIC role by referencing actual job requirements
3. Highlight relevant qualifications that MATCH the job description
4. Be respectful of the recipient's time
5. Include a clear call-to-action
6. Use professional but warm tone
7. Avoid being overly salesy or desperate
8. Reference 2-3 specific requirements or responsibilities from the job description
9. Connect the candidate's background to those specific requirements

Format:
- Subject line: Clear, professional, mentions the role
- Body: Professional greeting, brief introduction with specific job references, value proposition with matched qualifications, call-to-action, polite closing
- IMPORTANT: Use ONLY the actual values provided. NEVER use placeholders or generic terms.`;
    const user_prompt = `Generate a professional outreach email for the following:

**Job Details:**
- Position: ${input.job_title}
- Company: ${input.job_company}
${input.job_description ? `- Full Job Description:\n${input.job_description}` : ''}

**HR Contact:**
- Name: ${input.hr_name}
- Title: ${input.hr_job_title}

**Candidate Information (USE THESE EXACT VALUES):**
- Full Name: "${input.candidate_name}"
${input.candidate_email ? `- Email Address: "${input.candidate_email}"` : '- Email Address: Not provided'}
${input.candidate_phone ? `- Phone Number: "${input.candidate_phone}"` : '- Phone Number: Not provided'}
${input.candidate_background ? `- Professional Background: ${input.candidate_background}` : ''}

CRITICAL INSTRUCTIONS:
1. In the email body, write "My name is ${input.candidate_name}" (use this EXACT name, not "the candidate")
2. In the signature, write:
   ${input.candidate_name}
   ${input.candidate_email ? `Email: ${input.candidate_email}` : ''}
   ${input.candidate_phone ? `Phone: ${input.candidate_phone}` : ''}
3. DO NOT use any placeholders like [name], [email], [phone], or generic terms like "the candidate"
4. Reference specific aspects of the job description and the candidate's background

Please generate:
1. A compelling subject line
2. A professional email body following the instructions above


Return the response in JSON format with "subject" and "body" fields.`;
    // Debug logging: Log exact values being passed to LLM
    console.log('=== LLM INPUT VALUES ===');
    console.log('candidate_name:', JSON.stringify(input.candidate_name));
    console.log('candidate_email:', JSON.stringify(input.candidate_email));
    console.log('candidate_phone:', JSON.stringify(input.candidate_phone));
    console.log('candidate_background:', JSON.stringify(input.candidate_background));
    console.log('=== USER PROMPT (first 800 chars) ===');
    console.log(user_prompt.substring(0, 800));
    console.log('========================');
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: system_prompt },
                { role: 'user', content: user_prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 500
        });
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No content in LLM response');
        }
        const result = JSON.parse(content);
        return {
            subject: result.subject || `Inquiry about ${input.job_title} position`,
            body: result.body || ''
        };
    }
    catch (error) {
        throw new Error(`Failed to generate outreach message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Express route handler for generating outreach messages
 */
export async function handleGenerateOutreach(req, res, next) {
    try {
        const { job_external_id, job_title, job_company, hr_name, hr_email, hr_job_title } = req.body;
        // Validate required fields
        if (!job_title || !job_company || !hr_name || !job_external_id) {
            res.status(400).json({
                error: 'invalid_request',
                message: 'job_external_id, job_title, job_company, and hr_name are required'
            });
            return;
        }
        // Fetch full job description from external source
        const externalJobs = await fetchExternalJobs();
        const job = externalJobs.find(j => j.id === job_external_id);
        if (!job) {
            res.status(404).json({
                error: 'job_not_found',
                message: 'Job not found'
            });
            return;
        }
        // Fetch detailed JD using webhook
        const jdData = await fetchJobDescription(job.url, job.company);
        const fullJobDescription = jdData?.jdText || `${job.title} at ${job.company}. Location: ${job.location}. Tags: ${job.tags.join(', ')}.`;
        // Get the unified, LLM-aggregated profile from profiles.knowledge_base_summary
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('knowledge_base_summary')
            .eq('id', req.user.id)
            .single();
        if (profileError || !profileData || !profileData.knowledge_base_summary) {
            res.status(400).json({
                error: 'missing_profile',
                message: 'Please complete your profile first by uploading a resume or connecting LinkedIn'
            });
            return;
        }
        // Use the unified knowledge base summary
        const kb = profileData.knowledge_base_summary;
        const profileName = kb.name || '';
        const profileEmail = kb.email || '';
        const profilePhone = kb.phone || '';
        const skills = kb.skills || [];
        const experience = kb.experience || [];
        const education = kb.education || [];
        // Debug logging
        console.log('Profile data extracted:', {
            name: profileName,
            email: profileEmail,
            phone: profilePhone,
            skillsCount: skills.length,
            experienceCount: experience.length,
            educationCount: education.length,
            sourcesCount: kb.sources?.length || 0
        });
        // Validate that we have at least a name
        if (!profileName || profileName.trim() === '') {
            res.status(400).json({
                error: 'incomplete_profile',
                message: 'Your profile is missing your name. Please update your resume or LinkedIn profile.'
            });
            return;
        }
        // Calculate years of experience from experience array
        let yearsExperience = 0;
        if (experience.length > 0) {
            experience.forEach((exp) => {
                if (exp.duration_years) {
                    yearsExperience += exp.duration_years;
                }
            });
        }
        // Get education level from education array (already extracted above)
        let educationLevel = '';
        if (education.length > 0) {
            // Use the highest/most recent education
            const highestEd = education[0];
            educationLevel = highestEd.degree || '';
        }
        // Build candidate background summary
        const background = [
            yearsExperience > 0 ? `${Math.round(yearsExperience)} years of experience` : null,
            educationLevel ? `${educationLevel} degree` : null,
            skills.length > 0 ? `skilled in ${skills.slice(0, 3).join(', ')}` : null
        ].filter(Boolean).join(', ');
        // Generate the message
        const message = await generateOutreachMessage({
            job_title,
            job_company,
            job_description: fullJobDescription,
            hr_name,
            hr_job_title: hr_job_title || 'Recruiter',
            candidate_name: profileName.trim(),
            candidate_email: profileEmail.trim() || undefined,
            candidate_phone: profilePhone.trim() || undefined,
            candidate_background: background
        });
        // Optionally save to database
        if (job_external_id && hr_email) {
            await supabaseAdmin
                .from('hr_outreach_messages')
                .insert({
                user_id: req.user.id,
                job_external_id,
                job_title,
                job_company,
                hr_contact_name: hr_name,
                hr_contact_email: hr_email,
                message_subject: message.subject,
                message_body: message.body
            });
        }
        res.json(message);
    }
    catch (error) {
        next(error);
    }
}
