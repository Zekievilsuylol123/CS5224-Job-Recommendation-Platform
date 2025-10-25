import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SelfAssessmentPage from '../src/pages/SelfAssessment';
import { useProfileStore } from '../src/store/profile';

vi.mock('../src/api/client', () => ({
  analyzeResume: vi.fn(),
  assessCompass: vi.fn(async () => ({
    score: {
      total: 75,
      verdict: 'Likely',
      breakdown: { salary: 30, qualifications: 25, employer: 12, diversity: 8 },
      notes: ['Salary fit improved after tweaks.']
    }
  })),
  fetchJobs: vi.fn(),
  fetchJob: vi.fn(),
  fetchPlans: vi.fn(),
  createApplication: vi.fn(),
  fetchApplications: vi.fn()
}));

const resetStore = () => {
  useProfileStore.persist?.clearStorage?.();
  useProfileStore.setState((state) => ({
    ...state,
    basicInfo: {
      name: 'Alex',
      gender: 'Non-binary',
      nationality: 'Singaporean',
      educationLevel: 'Bachelors',
      plan: 'freemium'
    },
    profile: {
      id: 'local-user',
      name: 'Alex',
      educationLevel: 'Bachelors',
      plan: 'freemium',
      skills: ['typescript'],
      yearsExperience: 3,
      expectedSalarySGD: 7000
    },
    parsedProfile: undefined,
    applications: []
  }));
};

describe('SelfAssessmentPage', () => {
  beforeEach(() => {
    resetStore();
  });

  it('recalculates score after tweaking fields', async () => {
    render(<SelfAssessmentPage />);

    const salaryInput = screen.getByLabelText(/Expected salary/i);
    fireEvent.change(salaryInput, { target: { value: '8500' } });

    const button = screen.getByRole('button', { name: /recalculate score/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText(/Likely/i)).toBeInTheDocument();
    });
  });
});
