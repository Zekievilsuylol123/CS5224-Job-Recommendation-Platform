// AI Cover Letter Generator
// Generates personalized cover letters based on knowledge base and job description
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
export async function generateCoverLetter(knowledgeBase, job, tone = 'professional') {
    logger.info(`Generating cover letter for ${job.title} at ${job.company}`);
    try {
        const prompt = await loadPrompt('generate_cover_letter.txt');
        // Prepare relevant context from knowledge base
        const relevantContext = {
            name: knowledgeBase.name,
            summary: knowledgeBase.summary,
            recent_experience: knowledgeBase.experience.slice(0, 3).map((exp) => ({
                job_title: exp.job_title,
                company: exp.company,
                duration: exp.duration,
                key_achievements: exp.description.slice(0, 300),
            })),
            top_skills: knowledgeBase.skills.slice(0, 10),
            education: knowledgeBase.education.slice(0, 2).map((edu) => ({
                degree: edu.degree,
                field_of_study: edu.field_of_study,
                institution: edu.institution,
            })),
            notable_projects: knowledgeBase.projects.slice(0, 3).map((proj) => ({
                name: proj.name,
                description: proj.description.slice(0, 200),
                technologies: proj.technologies,
            })),
        };
        const jobSummary = {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description.slice(0, 800),
            key_requirements: job.requirements?.slice(0, 10),
        };
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: `Generate a ${tone} cover letter for the following job:\n\nJob:\n${JSON.stringify(jobSummary, null, 2)}\n\nCandidate Context:\n${JSON.stringify(relevantContext, null, 2)}\n\nTone: ${tone}`,
                },
            ],
            temperature: 0.8,
            max_tokens: 1500,
        });
        const content = completion.choices[0].message.content || '';
        // Extract key points mentioned in the cover letter
        const keyPoints = extractKeyPoints(content);
        const result = {
            content,
            word_count: content.split(/\s+/).length,
            tone,
            key_points: keyPoints,
        };
        logger.info(`Cover letter generated successfully (${result.word_count} words, ${tone} tone)`);
        return result;
    }
    catch (error) {
        logger.error('Failed to generate cover letter:', error);
        throw new Error(`Cover letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function extractKeyPoints(content) {
    const keyPoints = [];
    // Look for bullet points or numbered lists
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Match bullet points or numbered items
        const match = trimmed.match(/^(?:[-*•]|\d+\.)\s*(.+)$/);
        if (match) {
            keyPoints.push(match[1]);
        }
    }
    // If no bullet points found, extract sentences with strong verbs or achievements
    if (keyPoints.length === 0) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        for (const sentence of sentences) {
            if (sentence.match(/\b(led|developed|created|managed|improved|increased|achieved|delivered)\b/i) ||
                sentence.match(/\b(experience|expertise|proficiency|background)\b/i)) {
                keyPoints.push(sentence.trim());
            }
        }
    }
    return keyPoints.slice(0, 5); // Return top 5 key points
}
