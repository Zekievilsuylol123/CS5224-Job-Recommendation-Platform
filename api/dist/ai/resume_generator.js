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
        const jobSummary = {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description.slice(0, 1000), // Truncate if too long
            requirements: job.requirements?.slice(0, 15),
            preferred_qualifications: job.preferred_qualifications?.slice(0, 10),
        };
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: `Generate a tailored resume for the following job:\n\nJob:\n${JSON.stringify(jobSummary, null, 2)}\n\nCandidate Knowledge Base:\n${JSON.stringify(knowledgeSummary, null, 2)}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });
        const content = completion.choices[0].message.content || '';
        // Parse the generated resume to extract sections
        const sections = parseResumeContent(content);
        const result = {
            content,
            word_count: content.split(/\s+/).length,
            sections,
        };
        logger.info(`Resume generated successfully (${result.word_count} words)`);
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
