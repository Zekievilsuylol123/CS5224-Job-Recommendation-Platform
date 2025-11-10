// AI Resume Generator
// Generates tailored resumes based on knowledge base and job description
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { logger } from '../logger.js';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
async function loadPrompt(filename) {
    const promptPath = path.join(process.cwd(), 'resources', 'llm_prompts', filename);
    return fs.promises.readFile(promptPath, 'utf-8');
}
/**
 * Extract key technical keywords and skills from job description
 * This helps prioritize what should be emphasized in the resume
 */
function extractJobKeywords(job) {
    const text = `${job.title} ${job.description} ${job.requirements?.join(' ') || ''} ${job.preferred_qualifications?.join(' ') || ''}`.toLowerCase();
    // Common technical keywords to look for
    const technicalPatterns = [
        // Programming languages
        /\b(java|python|javascript|typescript|go|golang|rust|c\+\+|c#|ruby|php|swift|kotlin|scala|r\b|matlab)\b/gi,
        // Frontend frameworks
        /\b(react|angular|vue|svelte|next\.?js|nuxt|gatsby|remix)\b/gi,
        // Backend frameworks
        /\b(spring|spring boot|django|flask|fastapi|express|nest\.?js|rails|laravel|asp\.net)\b/gi,
        // Databases
        /\b(postgresql|postgres|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb|sql|nosql|firestore|sqlite)\b/gi,
        // Cloud platforms & services
        /\b(aws|amazon web services|azure|gcp|google cloud|ec2|s3|lambda|cloudfront|rds|ecs|eks)\b/gi,
        // DevOps & Infrastructure
        /\b(docker|kubernetes|k8s|ci\/cd|jenkins|gitlab ci|github actions|terraform|ansible|helm|argocd)\b/gi,
        // Tools & Technologies
        /\b(git|github|gitlab|bitbucket|jira|confluence|kafka|rabbitmq|graphql|rest|restful|grpc|websocket)\b/gi,
        // Architecture & Patterns
        /\b(microservices|monolith|serverless|event[- ]driven|api|soa|domain[- ]driven)\b/gi,
        // Data & ML
        /\b(spark|hadoop|airflow|pandas|numpy|scikit[- ]learn|tensorflow|pytorch|keras|jupyter)\b/gi,
        // Mobile
        /\b(ios|android|react native|flutter|swift|objective[- ]c)\b/gi,
        // Testing
        /\b(jest|mocha|pytest|junit|selenium|cypress|playwright|postman)\b/gi,
    ];
    const skillPatterns = [
        // Methodologies
        /\b(agile|scrum|kanban|waterfall|lean|safe|xp|extreme programming)\b/gi,
        // Practices
        /\b(code review|pair programming|tdd|test[- ]driven|bdd|behavior[- ]driven|continuous integration|continuous deployment)\b/gi,
        // Leadership & Soft Skills
        /\b(leadership|mentoring|coaching|team lead|stakeholder management|cross[- ]functional)\b/gi,
        // Technical Skills
        /\b(system design|software architecture|design patterns|refactoring|debugging|troubleshooting)\b/gi,
        /\b(scalability|performance optimization|load balancing|caching|distributed systems)\b/gi,
        /\b(security|authentication|authorization|encryption|oauth|jwt|ssl|tls)\b/gi,
        /\b(monitoring|logging|observability|prometheus|grafana|elk|datadog|new relic)\b/gi,
        // Data & Analytics
        /\b(machine learning|deep learning|nlp|computer vision|data analysis|data science|analytics|etl|data pipeline|data warehouse)\b/gi,
        /\b(a\/b testing|experimentation|metrics|kpis|dashboards|visualization)\b/gi,
    ];
    const rolePatterns = [
        // Seniority levels
        /\b(senior|staff|principal|lead|chief|head of|director|vp|vice president|junior|mid[- ]level)\b/gi,
        // Specializations
        /\b(full[- ]?stack|back[- ]?end|front[- ]?end|devops|sre|site reliability|platform|infrastructure|data|ml|ai)\b/gi,
        /\b(architect|engineer|developer|programmer|analyst|scientist|manager|consultant)\b/gi,
    ];
    const extractMatches = (patterns) => {
        const matches = new Set();
        patterns.forEach(pattern => {
            const found = text.match(pattern);
            if (found) {
                found.forEach(m => matches.add(m.toLowerCase()));
            }
        });
        return Array.from(matches);
    };
    return {
        technical_keywords: extractMatches(technicalPatterns),
        skill_keywords: extractMatches(skillPatterns),
        role_keywords: extractMatches(rolePatterns),
    };
}
/**
 * Highlight matched keywords in the generated content for ATS optimization visibility
 * Uses <mark> tags for yellow highlighting without modifying the original text
 */
function highlightMatchedKeywords(content, keywords) {
    const allKeywords = [
        ...keywords.technical_keywords,
        ...keywords.skill_keywords,
        ...keywords.role_keywords,
    ];
    if (allKeywords.length === 0)
        return content;
    let processedContent = content;
    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = [...new Set(allKeywords)].sort((a, b) => b.length - a.length);
    sortedKeywords.forEach(keyword => {
        // Create a regex that:
        // 1. Matches the keyword as a whole word (case-insensitive)
        // 2. Is not already highlighted (not within <mark> tags)
        // 3. Is not in a code block (not between ` or ```)
        // 4. Is not in URLs or emails
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match keyword that:
        // - Is a word boundary
        // - Not already between <mark> tags
        // - Not between ` (inline code)
        // - Not in URLs or emails
        const regex = new RegExp(`(?<!<mark>)(?<!\`)\\b(${escapedKeyword})\\b(?!\`)(?![^<]*<\/mark>)(?![^\\s]*@)(?![^\\s]*\\.(com|org|net|io))`, 'gi');
        processedContent = processedContent.replace(regex, '<mark>$1</mark>');
    });
    return processedContent;
}
export async function generateResume(knowledgeBase, job) {
    logger.info(`Generating resume for ${job.title} at ${job.company}`);
    try {
        const prompt = await loadPrompt('generate_resume.txt');
        // Prepare knowledge base summary
        const knowledgeSummary = {
            contact: {
                name: knowledgeBase.name,
                email: knowledgeBase.email,
                phone: knowledgeBase.phone,
                location: knowledgeBase.location,
                linkedin_profile_url: knowledgeBase.linkedin_profile_url,
                github_username: knowledgeBase.github_username,
            },
            summary: knowledgeBase.summary,
            skills: knowledgeBase.skills.slice(0, 50),
            technical_skills: knowledgeBase.technical_skills,
            soft_skills: knowledgeBase.soft_skills,
            languages: knowledgeBase.languages,
            experience: knowledgeBase.experience.map((exp) => ({
                job_title: exp.job_title,
                company: exp.company,
                location: exp.location,
                duration: exp.duration,
                description: exp.description,
                skills: exp.skills,
                start_date: exp.start_date,
                end_date: exp.end_date,
                is_current: exp.is_current,
            })),
            education: knowledgeBase.education.map((edu) => ({
                institution: edu.institution,
                degree: edu.degree,
                field_of_study: edu.field_of_study,
                duration: edu.duration,
                gpa: edu.gpa,
            })),
            certifications: knowledgeBase.certifications,
            projects: knowledgeBase.projects.map((proj) => ({
                name: proj.name,
                description: proj.description,
                technologies: proj.technologies,
                url: proj.url,
            })),
        };
        // Debug logging - Contact info
        logger.info('Resume generation - Contact info:', knowledgeSummary.contact);
        const jobSummary = {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description, // Full JD for better keyword matching
            requirements: job.requirements,
            preferred_qualifications: job.preferred_qualifications,
        };
        // Extract key keywords from JD for targeted tailoring
        const jobKeywords = extractJobKeywords(job);
        // Detailed logging of what we're sending to LLM
        logger.info('=== RESUME GENERATION - LLM INPUT ===');
        logger.info('Contact Info:', {
            name: knowledgeSummary.contact.name,
            email: knowledgeSummary.contact.email,
            phone: knowledgeSummary.contact.phone,
            linkedin_profile_url: knowledgeSummary.contact.linkedin_profile_url,
            github_username: knowledgeSummary.contact.github_username,
        });
        logger.info('Job Summary:', jobSummary);
        logger.info('Extracted JD Keywords:', jobKeywords);
        logger.info({ job_description_length: job.description.length });
        logger.info({ skills_count: knowledgeSummary.skills.length });
        logger.info({ experience_count: knowledgeSummary.experience.length });
        logger.info({ education_count: knowledgeSummary.education.length });
        logger.info({ projects_count: knowledgeSummary.projects.length });
        logger.info({ certifications_count: knowledgeSummary.certifications.length });
        logger.info('=====================================');
        // Build enhanced user message with explicit keyword guidance
        const keywordGuidance = `
IMPORTANT - ATS KEYWORD OPTIMIZATION:
The following keywords were extracted from the job description. You MUST incorporate these naturally throughout the resume where the candidate has relevant experience:

Technical Keywords to Prioritize: ${jobKeywords.technical_keywords.join(', ') || 'None extracted'}
Skill Keywords to Emphasize: ${jobKeywords.skill_keywords.join(', ') || 'None extracted'}
Role-Level Keywords: ${jobKeywords.role_keywords.join(', ') || 'None extracted'}

When writing the resume:
1. Use these EXACT terms (matching case from JD) in the Skills section if the candidate has them
2. Incorporate them naturally in experience bullet points where truthful
3. Mirror the JD's language style and terminology
4. Prioritize experiences that demonstrate these skills
5. DO NOT add skills the candidate doesn't have - only emphasize existing matches
`;
        const userMessage = `${keywordGuidance}

Generate a tailored resume for the following job:

Job:
${JSON.stringify(jobSummary, null, 2)}

Candidate Knowledge Base:
${JSON.stringify(knowledgeSummary, null, 2)}`;
        // Log the full user message (truncated for readability)
        logger.info({ llm_message_preview: userMessage.slice(0, 800) + '...' });
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: userMessage,
                },
            ],
            temperature: 0.7,
            max_tokens: 4500, // Increased from 3000 to allow for more comprehensive 1.5-2 page resumes (~800-900 words)
        });
        const content = completion.choices[0].message.content || '';
        // Highlight matched keywords for ATS optimization visibility
        const contentWithHighlights = highlightMatchedKeywords(content, jobKeywords);
        // Parse the generated resume to extract sections
        const sections = parseResumeContent(contentWithHighlights);
        const result = {
            content: contentWithHighlights,
            word_count: contentWithHighlights.split(/\s+/).length,
            sections,
        };
        logger.info(`Resume generated successfully (${result.word_count} words, keywords highlighted)`);
        return result;
    }
    catch (error) {
        logger.error('Failed to generate resume:', error);
        throw new Error(`Resume generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function parseResumeContent(content) {
    // Simple parser to extract sections from markdown resume
    const sections = {
        summary: '',
        skills: [],
        experience: '',
        education: '',
    };
    const lines = content.split('\n');
    let currentSection = '';
    for (const line of lines) {
        const trimmed = line.trim();
        // Detect section headers
        if (trimmed.match(/^#+\s*(Summary|Professional Summary|About)/i)) {
            currentSection = 'summary';
            continue;
        }
        else if (trimmed.match(/^#+\s*Skills/i)) {
            currentSection = 'skills';
            continue;
        }
        else if (trimmed.match(/^#+\s*(Experience|Work Experience)/i)) {
            currentSection = 'experience';
            continue;
        }
        else if (trimmed.match(/^#+\s*Education/i)) {
            currentSection = 'education';
            continue;
        }
        else if (trimmed.match(/^#+\s*Projects/i)) {
            currentSection = 'projects';
            continue;
        }
        else if (trimmed.match(/^#+\s*Certifications/i)) {
            currentSection = 'certifications';
            continue;
        }
        // Add content to current section
        if (currentSection === 'summary') {
            sections.summary += trimmed + ' ';
        }
        else if (currentSection === 'skills') {
            // Extract skills from bullet points
            const skillMatch = trimmed.match(/^[-*•]\s*(.+)$/);
            if (skillMatch) {
                sections.skills.push(skillMatch[1]);
            }
        }
        else if (currentSection === 'experience') {
            sections.experience += line + '\n';
        }
        else if (currentSection === 'education') {
            sections.education += line + '\n';
        }
        else if (currentSection === 'projects') {
            sections.projects = (sections.projects || '') + line + '\n';
        }
        else if (currentSection === 'certifications') {
            sections.certifications = (sections.certifications || '') + line + '\n';
        }
    }
    sections.summary = sections.summary.trim();
    sections.experience = sections.experience.trim();
    sections.education = sections.education.trim();
    return sections;
}
