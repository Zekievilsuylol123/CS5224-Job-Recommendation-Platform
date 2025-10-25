import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ResumeDropzone from '../src/components/ResumeDropzone';

const mockScore = {
  total: 72,
  breakdown: { salary: 30, qualifications: 22, employer: 12, diversity: 8 },
  verdict: 'Likely',
  notes: ['Expected salary fits within job band.']
} as const;

describe('ResumeDropzone', () => {
  it('rejects unsupported file types', () => {
    const onValidationError = vi.fn();
    render(
      <ResumeDropzone status="idle" onSelect={vi.fn()} onValidationError={onValidationError} />
    );

    const input = screen.getByTestId('resume-input');
    const file = new File(['Resume'], 'resume.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onValidationError).toHaveBeenCalledWith('Only PDF or DOCX resumes are supported.');
  });

  it('rejects files beyond size limit', () => {
    const onValidationError = vi.fn();
    render(
      <ResumeDropzone status="idle" onSelect={vi.fn()} onValidationError={onValidationError} />
    );

    const input = screen.getByTestId('resume-input');
    const largeFile = new File(['x'.repeat(4 * 1024 * 1024)], 'resume.pdf', {
      type: 'application/pdf'
    });
    Object.defineProperty(largeFile, 'size', { value: 4 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(onValidationError).toHaveBeenCalledWith('Resume must be 3MB or smaller.');
  });

  it('renders score result', () => {
    render(
      <ResumeDropzone status="result" onSelect={vi.fn()} result={mockScore} />
    );

    expect(screen.getByText('Latest Score')).toBeInTheDocument();
    expect(screen.getByText(String(mockScore.total))).toBeInTheDocument();
    expect(screen.getByText(mockScore.verdict)).toBeInTheDocument();
  });
});
