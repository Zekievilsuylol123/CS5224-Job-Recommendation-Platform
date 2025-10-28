import { describe, expect, it } from 'vitest';
import { scoreCompass } from '../src/scoreCompass.js';

const baseInput = {
  user: {
    educationLevel: 'Bachelors',
    educationInstitution: 'National University of Singapore',
    skills: ['typescript', 'react', 'node.js'],
    plan: 'pro',
    yearsExperience: 5,
    expectedSalarySGD: 8000
  },
  job: {
    title: 'Software Engineer',
    industry: 'Technology',
    salaryMinSGD: 7000,
    salaryMaxSGD: 9000,
    requirements: ['typescript', 'react', 'node.js', '3+ years experience'],
    employer: {
      size: 'MNC',
      localHQ: true
    }
  }
} as const;

describe('scoreCompass', () => {
  it('returns Likely verdict when benchmarks are met', () => {
    const result = scoreCompass(baseInput);
    expect(result.verdict).toBe('Likely');
    expect(result.breakdown.salary).toBe(20);
    expect(result.breakdown.qualifications).toBe(20);
  });

  it('returns Borderline verdict when salary falls short', () => {
    const result = scoreCompass({
      ...baseInput,
      user: {
        ...baseInput.user,
        educationInstitution: 'Regional University',
        expectedSalarySGD: 4500,
        yearsExperience: 2,
        skills: ['excel']
      },
      job: {
        ...baseInput.job,
        title: 'Business Analyst',
        salaryMinSGD: 6000,
        salaryMaxSGD: 7800,
        employer: { size: 'Startup', localHQ: true }
      }
    });
    expect(result.verdict).toBe('Borderline');
    expect(result.breakdown.salary).toBe(0);
  });

  it('returns Unlikely verdict when key thresholds are missed', () => {
    const result = scoreCompass({
      user: {
        educationLevel: 'Diploma',
        skills: ['excel'],
        expectedSalarySGD: 3200,
        yearsExperience: 1,
        plan: 'freemium'
      },
      job: {
        title: 'UI Designer',
        industry: 'Product',
        salaryMinSGD: 6200,
        salaryMaxSGD: 7800,
        requirements: ['stakeholder management', '5+ years experience'],
        employer: { size: 'Startup', localHQ: false }
      }
    });
    expect(result.verdict).toBe('Unlikely');
  });
});
