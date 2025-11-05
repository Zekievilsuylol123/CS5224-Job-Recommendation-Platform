import OpenAI from "openai";
import fs from "node:fs";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { toFile } from "openai/uploads";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const ProfileSchema = z.object({
    name: z.string(),
    email: z.string(),
    telephone: z.string(),
    education: z.array(
        z.object({
            institution: z.string(),
            degree: z.string(),
            field_of_study: z.string(),
            duration: z.string()
        })
    ),
    skills: z.array(z.string()),
    experience: z.array(
        z.object({
            job_title: z.string(),
            company: z.string(),
            duration: z.string(),
            description: z.string()
        })
    )
});

export async function extract_resume_info(resume: Express.Multer.File): Promise<string> {
  const uploadable = await toFile(resume.buffer, resume.originalname, {
    type: resume.mimetype,
  });

  const pdf = await client.files.create({
    file: uploadable,
    purpose: "assistants"
  });

  const prompt = fs.readFileSync("resources\\llm_prompts\\extract_resume_info.txt", "utf8");
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
      format: zodTextFormat(ProfileSchema as any, "profile"),
    },
  });
  console.log(res);

  return res.output_text;
}