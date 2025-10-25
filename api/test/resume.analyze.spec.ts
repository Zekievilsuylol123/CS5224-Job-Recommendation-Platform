const SAMPLE_TEXT = `
  Jane Doe
  jane.doe@example.com
  Experience 2019 - Present Senior Software Engineer
  Skills: TypeScript, React, Node.js, SQL
  Bachelor's degree in Computer Science
  Expected salary: SGD 9,000
`;

import { describe, expect, it, vi } from 'vitest';

vi.mock('pdf-parse', () => {
  return {
    default: vi.fn(async () => ({ text: SAMPLE_TEXT }))
  };
});

vi.mock('mammoth', () => ({
  extractRawText: vi.fn(async () => ({ value: SAMPLE_TEXT }))
}));

import type { Express } from 'express';
import { analyzeResume, extractTextFromResume, isAllowedResumeMime } from '../src/resume/analyzer.js';
import { scoreCompass } from '../src/scoreCompass.js';

const BASE_FILE = {
  fieldname: 'file',
  originalname: 'resume.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: SAMPLE_TEXT.length,
  buffer: Buffer.from('dummy')
} as unknown as Express.Multer.File;

describe('resume analyzer', () => {
  it('validates allowed mime types', () => {
    expect(isAllowedResumeMime('application/pdf')).toBe(true);
    expect(isAllowedResumeMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(isAllowedResumeMime('text/plain')).toBe(false);
  });

  it('extracts text from supported files', async () => {
    const text = await extractTextFromResume(BASE_FILE);
    expect(text).toContain('Jane Doe');
  });

  it('returns score even with partial profile data', async () => {
    const { profile, score, tips } = await analyzeResume(BASE_FILE, {
      user: {
        plan: 'standard',
        skills: ['typescript']
      }
    });

    expect(profile.skills).toContain('typescript');
    expect(score.total).toBeGreaterThan(0);
    expect(scoreCompass({ user: profile }).total).toBeGreaterThanOrEqual(0);
    expect(tips.length).toBeGreaterThan(0);
  });

  it('throws on unsupported file types', async () => {
    await expect(
      extractTextFromResume({
        ...BASE_FILE,
        mimetype: 'text/plain'
      })
    ).rejects.toThrow('Unsupported file type');
  });
});
