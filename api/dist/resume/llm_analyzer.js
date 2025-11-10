import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { toFile } from "openai/uploads";
import { resourcePath } from "../utils/resourcePath.js";
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export const ProfileSchema = z.object({
    name: z.string(),
    email: z.string(),
    telephone: z.string(),
    education: z.array(z.object({
        institution: z.string(),
        degree: z.string(),
        field_of_study: z.string(),
        duration: z.string()
    })),
    skills: z.array(z.string()),
    experience: z.array(z.object({
        job_title: z.string(),
        company: z.string(),
        duration: z.string(),
        description: z.string()
    }))
});
export const ProjectDocumentSchema = z.object({
    name: z.string(),
    email: z.string(),
    telephone: z.string(),
    skills: z.array(z.string()),
    projects: z.array(z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()),
        url: z.string().nullable(),
        start_date: z.string().nullable(),
        end_date: z.string().nullable()
    })),
    experience: z.array(z.object({
        job_title: z.string(),
        company: z.string(),
        duration: z.string(),
        description: z.string()
    })),
    education: z.array(z.object({
        institution: z.string(),
        degree: z.string(),
        field_of_study: z.string(),
        duration: z.string()
    }))
});
export async function extract_resume_info(resume) {
    const uploadable = await toFile(resume.buffer, resume.originalname, {
        type: resume.mimetype,
    });
    const pdf = await client.files.create({
        file: uploadable,
        purpose: "assistants"
    });
    const prompt = fs.readFileSync(resourcePath("llm_prompts/extract_resume_info.txt"), "utf8");
    console.log(prompt);
    const res = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: prompt },
                    { type: "input_file", file_id: pdf.id }
                ],
            }
        ],
        text: {
            format: zodTextFormat(ProfileSchema, "profile"),
        },
    });
    console.log(res);
    // Parse the JSON string returned by the LLM into an object
    const parsedProfile = JSON.parse(res.output_text);
    return parsedProfile;
}
export async function extract_project_info(document) {
    const uploadable = await toFile(document.buffer, document.originalname, {
        type: document.mimetype,
    });
    const pdf = await client.files.create({
        file: uploadable,
        purpose: "assistants"
    });
    const prompt = fs.readFileSync(path.join("resources", "llm_prompts", "extract_project_info.txt"), "utf8");
    console.log(prompt);
    const res = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: prompt },
                    { type: "input_file", file_id: pdf.id }
                ],
            }
        ],
        text: {
            format: zodTextFormat(ProjectDocumentSchema, "project_document"),
        },
    });
    console.log(res);
    // Parse the JSON string returned by the LLM into an object
    const parsedDocument = JSON.parse(res.output_text);
    return parsedDocument;
}
