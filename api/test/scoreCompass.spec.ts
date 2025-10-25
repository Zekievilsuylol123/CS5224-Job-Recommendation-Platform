import { describe, expect, it } from 'vitest';
import { scoreCompass } from '../src/scoreCompass.js';

const baseInput = {
  user: {
    educationLevel: 'Bachelors',
    skills: ['typescript', 'react', 'node.js'],
    plan: 'pro',
    yearsExperience: 5,
    expectedSalarySGD: 8000
  },
  job: {
    salaryMinSGD: 7000,
    salaryMaxSGD: 9000,
    requirements: ['typescript', 'react', 'node.js', '3+ years experience'],
    employer: {
      size: 'MNC',
      diversityScore: 0.8
    }
  }
} as const;

describe('scoreCompass', () => {
  it('returns Likely verdict at 70 threshold', () => {
    const result = scoreCompass(baseInput);
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.verdict).toBe('Likely');
  });

  it('returns Borderline verdict at 50 threshold', () => {
    const result = scoreCompass({
      ...baseInput,
      user: {
        ...baseInput.user,
        expectedSalarySGD: 11000,
        skills: ['typescript'],
        yearsExperience: 2
      }
    });
    expect(result.total).toBeGreaterThanOrEqual(50);
    expect(result.total).toBeLessThan(70);
    expect(result.verdict).toBe('Borderline');
  });

  it('returns Unlikely verdict below 50', () => {
    const result = scoreCompass({
      user: {
        educationLevel: 'Diploma',
        skills: ['excel'],
        expectedSalarySGD: 15000,
        yearsExperience: 1,
        plan: 'freemium'
      },
      job: {
        salaryMinSGD: 5000,
        salaryMaxSGD: 7000,
        requirements: ['python', 'machine learning', '5+ years experience'],
        employer: { size: 'Startup', diversityScore: 0.4 }
      }
    });
    expect(result.total).toBeLessThan(50);
    expect(result.verdict).toBe('Unlikely');
  });
});
