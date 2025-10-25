import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import JobCard from '../src/components/JobCard';

const baseJob = {
  id: 'job-1',
  title: 'Software Engineer',
  company: 'NovaTech',
  location: 'Singapore',
  industry: 'Technology',
  description: 'Build things.',
  requirements: ['typescript'],
  employer: { size: 'Startup' as const },
  createdAt: new Date().toISOString()
};

describe('JobCard', () => {
  it('displays Likely pill', () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...baseJob, epIndicator: 'Likely', score: 80 }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Likely')).toBeInTheDocument();
  });

  it('displays Borderline pill', () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...baseJob, epIndicator: 'Borderline', score: 60 }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Borderline')).toBeInTheDocument();
  });

  it('displays Unlikely pill', () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...baseJob, epIndicator: 'Unlikely', score: 40 }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Unlikely')).toBeInTheDocument();
  });
});
