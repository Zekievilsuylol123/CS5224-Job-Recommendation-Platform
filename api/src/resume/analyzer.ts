import type { Express } from 'express';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { parseResumeText } from '../parse/resume.js';
import { ParsedProfile, AssessmentInput } from '../types.js';
import { scoreCompass } from '../scoreCompass.js';

const ALLOWED_MIME = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

export function isAllowedResumeMime(mime?: string): boolean {
  return Boolean(mime && ALLOWED_MIME.has(mime));
}

export async function extractTextFromResume(file: Express.Multer.File): Promise<string> {
  if (!isAllowedResumeMime(file.mimetype)) {
    throw new Error('Unsupported file type');
  }

  if (file.mimetype === 'application/pdf') {
    const result = await pdf(file.buffer);
    return result.text ?? '';
  }

  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value ?? '';
}

export interface ResumeAnalysisResult {
  profile: ParsedProfile;
  score: ReturnType<typeof scoreCompass>;
  tips: string[];
}

export async function analyzeResume(
  file: Express.Multer.File,
  overrideInput: AssessmentInput = { user: {} }
): Promise<ResumeAnalysisResult> {
  const text = await extractTextFromResume(file);
  const profile = parseResumeText(text);
  const mergedUser = {
    ...overrideInput.user,
    ...profile,
    skills: Array.from(new Set([...(overrideInput.user.skills ?? []), ...(profile.skills ?? [])]))
  };
  const score = scoreCompass({
    user: mergedUser,
    job: overrideInput.job
  });

  const tips: string[] = [];
  if (!profile.skills || profile.skills.length === 0) {
    tips.push('Add a dedicated “Skills” section with specific technologies.');
  } else {
    tips.push('Reorder your skills section to highlight the most in-demand tools first.');
  }
  if (!profile.expectedSalarySGD) {
    tips.push('Include a salary expectation to speed up hiring conversations.');
  }
  if (!profile.yearsExperience) {
    tips.push('Call out years of experience in summary bullet points.');
  }

  return {
    profile,
    score,
    tips
  };
}
