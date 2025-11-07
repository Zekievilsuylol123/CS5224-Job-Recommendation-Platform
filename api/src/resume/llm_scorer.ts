import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import path from "node:path";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { toFile } from "openai/uploads";
import { RoleTemplate } from "src/seedJobs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const system_prompt = fs.readFileSync(
  new URL("../../resources/llm_prompts/profile_jd_score_system.txt", import.meta.url),
  "utf8"
);
var user_prompt = fs.readFileSync(
  new URL("../../resources/llm_prompts/profile_jd_score_user.txt", import.meta.url),
  "utf8"
);

export const ProfileSchema = z.object({
    candidate_name: z.string(),
    candidate_email: z.string().email(),
    role_title: z.string(),
    overall_score: z.number().int().min(0).max(100),
    must_have_coverage: z.number({ message: "Must be a floating-point number" }).min(0.0).max(1.0),
    subscores: z.object({
        must_have: z.number().int().min(0).max(5),
        nice_to_have: z.number().int().min(0).max(5),
        role_level_match: z.number().int().min(0).max(5),
        domain_fit: z.number().int().min(0).max(5),
        impact_evidence: z.number().int().min(0).max(5),
        tools_stack: z.number().int().min(0).max(5),
        communication: z.number().int().min(0).max(5)
    }),
    decision: z.enum(["strong_match", "possible_match", "weak_match", "reject"]),
    evidence: z.object({
        matched_must_haves: z.array(z.string()),
        matched_nice_to_haves: z.array(z.string()),
        impact_highlights: z.array(z.string(), { message: "1–2 bullet quotes with numbers if present" }),
        tools_stack_matched: z.array(z.string())
    }),
    gaps: z.object({
        missing_must_haves: z.array(z.string()),
        risks: z.array(z.string(), { message: "short tenure, employment gaps, irrelevant domain, level mismatch, work authorization unknown, etc." })
    }),
    questions_for_interview: z.array(z.string()),
    recommendations_to_candidate: z.array(z.string(), { message: "most impactful improvements for resume or prep" }),
    notes: z.string({ message: "short free-text if anything non-standard" })
});

export async function get_score(resume: Express.Multer.File, role: RoleTemplate): Promise<string> {

    // update prompt
    user_prompt = user_prompt.replace("{{ role_title }}", role.title);
    user_prompt = user_prompt.replace("{{ industry }}", role.industry);
    user_prompt = user_prompt.replace("{{ base_salary }}", role.baseSalary[0] + " - " + role.baseSalary[1]);
    user_prompt = user_prompt.replace("{{ job_requirements }}", role.requirements.join("\n"));
    user_prompt = user_prompt.replace("{{ job_description }}", role.description);
    console.log(user_prompt);

    const uploadable = await toFile(resume.buffer, resume.originalname, {
        type: resume.mimetype,
    });

    const pdf = await client.files.create({
        file: uploadable,
        purpose: "assistants"
    });

    const res = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "system",
                content: [
                    { type: "input_text", text: system_prompt }
                ]
            },
            {
                role: "user",
                content: [
                    { type: "input_text", text: user_prompt },
                    { type: "input_file", file_id: pdf.id }
                ]
            }
        ],
        text: {
          format: zodTextFormat(ProfileSchema as any, "profile"),
        },
    });
    console.log(res);

    return res.output_text;
}
