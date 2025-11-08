import OpenAI from 'openai';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from './supabase.js';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OutreachMessageRequest {
  job_title: string;
  job_company: string;
  hr_name: string;
  hr_job_title: string;
  candidate_name: string;
  candidate_background?: string; // Brief summary of candidate's background
}

export interface OutreachMessageResponse {
  subject: string;
  body: string;
}

/**
 * Generate a professional, polite, and tailored HR outreach message using LLM
 */
export async function generateOutreachMessage(
  input: OutreachMessageRequest
): Promise<OutreachMessageResponse> {
  const system_prompt = `You are an expert career advisor helping job seekers craft professional, polite, and effective outreach messages to HR professionals.

Your messages should:
1. Be concise (150-200 words)
2. Show genuine interest in the specific role
3. Highlight relevant qualifications briefly
4. Be respectful of the recipient's time
5. Include a clear call-to-action
6. Use professional but warm tone
7. Avoid being overly salesy or desperate

Format:
- Subject line: Clear, professional, mentions the role
- Body: Professional greeting, brief introduction, value proposition, call-to-action, polite closing`;

  const user_prompt = `Generate a professional outreach email for the following:

**Job Details:**
- Position: ${input.job_title}
- Company: ${input.job_company}

**HR Contact:**
- Name: ${input.hr_name}
- Title: ${input.hr_job_title}

**Candidate:**
- Name: ${input.candidate_name}
${input.candidate_background ? `- Background: ${input.candidate_background}` : ''}

Please generate:
1. A compelling subject line
2. A professional email body

Return the response in JSON format with "subject" and "body" fields.`;

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
  } catch (error) {
    throw new Error(
      `Failed to generate outreach message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Express route handler for generating outreach messages
 */
export async function handleGenerateOutreach(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      job_external_id,
      job_title,
      job_company,
      hr_name,
      hr_email,
      hr_job_title
    } = req.body;

    // Validate required fields
    if (!job_title || !job_company || !hr_name) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'job_title, job_company, and hr_name are required'
      });
      return;
    }

    // Get user profile for background context
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, skills, years_experience, education_level')
      .eq('id', (req as any).user!.id)
      .single();

    if (!profile) {
      res.status(400).json({
        error: 'missing_profile',
        message: 'Please complete your profile first'
      });
      return;
    }

    // Build candidate background summary
    const background = [
      profile.years_experience ? `${profile.years_experience} years of experience` : null,
      profile.education_level ? `${profile.education_level} degree` : null,
      profile.skills?.length > 0 ? `skilled in ${profile.skills.slice(0, 3).join(', ')}` : null
    ].filter(Boolean).join(', ');

    // Generate the message
    const message = await generateOutreachMessage({
      job_title,
      job_company,
      hr_name,
      hr_job_title: hr_job_title || 'Recruiter',
      candidate_name: profile.name || 'the candidate',
      candidate_background: background
    });

    // Optionally save to database
    if (job_external_id && hr_email) {
      await supabaseAdmin
        .from('hr_outreach_messages')
        .insert({
          user_id: (req as any).user!.id,
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
  } catch (error) {
    next(error);
  }
}
