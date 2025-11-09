import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Zod schema for COMPASS score output
export const CompassScoreSchema = z.object({
    total: z.number().int().min(0).max(100),
    breakdown: z.object({
        salary: z.number().int().min(0).max(20),
        qualifications: z.number().int().min(0).max(20),
        diversity: z.number().int().min(0).max(20),
        support: z.number().int().min(0).max(20),
        skills: z.number().int().min(0).max(20),
        strategic: z.number().int().min(0).max(10)
    }),
    verdict: z.enum(['Likely', 'Borderline', 'Unlikely']),
    notes: z.array(z.string())
});
/**
 * Score a candidate's profile using LLM-based COMPASS assessment
 */
export async function scoreCompassWithLLM(input) {
    // Load the system prompt (resolve from api/src to project root)
    const systemPrompt = fs.readFileSync(path.join(__dirname, "..", "..", "resources", "llm_prompts", "compass_scoring.txt"), "utf8");
    // Format the user input as a structured prompt
    const userPrompt = formatAssessmentInput(input);
    console.log("Scoring with LLM - User Prompt:", userPrompt);
    // Call OpenAI with structured output
    const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        text: {
            format: zodTextFormat(CompassScoreSchema, "compass_score"),
        },
    });
    console.log("LLM Response:", response.output_text);
    // Parse the JSON response
    const result = JSON.parse(response.output_text);
    // Compute totalRaw from breakdown (sum of criterion points)
    const breakdownValues = Object.values(result.breakdown || {});
    const totalRaw = breakdownValues.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
    // Normalize total percentage against 110 (total possible points)
    const TOTAL_POSSIBLE = 110;
    const totalPercent = Math.round((totalRaw / TOTAL_POSSIBLE) * 100);
    // Augment/overwrite to ensure consistency between breakdown and totals
    result.totalRaw = totalRaw;
    result.total = totalPercent;
    return result;
}
/**
 * Format the assessment input into a clear prompt for the LLM
 */
function formatAssessmentInput(input) {
    const { user, job } = input;
    let prompt = "# CANDIDATE PROFILE\n\n";
    // User information
    if (user.name)
        prompt += `**Name**: ${user.name}\n`;
    if (user.nationality)
        prompt += `**Nationality**: ${user.nationality}\n`;
    if (user.gender)
        prompt += `**Gender**: ${user.gender}\n`;
    // Education
    if (user.educationLevel) {
        prompt += `**Education Level**: ${user.educationLevel}\n`;
    }
    if (user.educationInstitution) {
        prompt += `**Education Institution**: ${user.educationInstitution}\n`;
    }
    // Certifications
    if (user.certifications && user.certifications.length > 0) {
        prompt += `**Certifications**: ${user.certifications.join(", ")}\n`;
    }
    // Experience
    if (user.yearsExperience !== undefined) {
        prompt += `**Years of Experience**: ${user.yearsExperience} years\n`;
    }
    // Skills
    if (user.skills && user.skills.length > 0) {
        prompt += `**Skills**: ${user.skills.join(", ")}\n`;
    }
    // Salary
    if (user.expectedSalarySGD !== undefined && user.expectedSalarySGD !== null) {
        prompt += `**Expected Salary**: SGD $${user.expectedSalarySGD.toLocaleString()}/month\n`;
    }
    else {
        prompt += `**Expected Salary**: Not provided\n`;
    }
    // Note: Employer history data not available in current schema
    prompt += `**Previous Employers**: No data available\n`;
    // Job information (if provided)
    if (job) {
        prompt += "\n# JOB DETAILS\n\n";
        if (job.title)
            prompt += `**Job Title**: ${job.title}\n`;
        if (job.company)
            prompt += `**Company**: ${job.company}\n`;
        if (job.industry)
            prompt += `**Industry**: ${job.industry}\n`;
        if (job.location)
            prompt += `**Location**: ${job.location}\n`;
        if (job.requirements && job.requirements.length > 0) {
            prompt += `**Requirements**:\n`;
            job.requirements.forEach((req) => {
                prompt += `- ${req}\n`;
            });
        }
        if (job.description) {
            prompt += `**Description**: ${job.description}\n`;
        }
    }
    else {
        prompt += "\n# JOB DETAILS\n\nNo specific job provided. Assess candidate profile in general.\n";
    }
    prompt += "\n---\n\nPlease evaluate this candidate using the COMPASS framework and return the score in the specified JSON format.";
    return prompt;
}
