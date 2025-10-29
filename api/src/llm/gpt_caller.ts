import OpenAI from "openai";
import fs from "node:fs";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pdf = await client.files.create({
  file: fs.createReadStream("resources\\sample_resumes\\graduate_cs.pdf"),
  purpose: "assistants"
});

const prompt = fs.readFileSync("resources\\llm_prompts\\extract_resume_info.txt", "utf8");
console.log(prompt);

const ProfileSchema = z.object({
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