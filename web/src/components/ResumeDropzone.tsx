import { useRef } from 'react';
import type { CompassScore } from '../types';

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_BYTES = 3 * 1024 * 1024;

export type ResumeUploadStatus = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

interface Props {
  status: ResumeUploadStatus;
  onSelect: (file: File) => void;
  error?: string;
  result?: CompassScore;
  onValidationError?: (message: string) => void;
}

export default function ResumeDropzone({ status, onSelect, error, result, onValidationError }: Props): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      const message = 'Only PDF or DOCX resumes are supported.';
      onValidationError?.(message);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_BYTES) {
      const message = 'Resume must be 3MB or smaller.';
      onValidationError?.(message);
      event.target.value = '';
      return;
    }

    onSelect(file);
  };

  const buttonLabel = (() => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'analyzing':
        return 'Analyzing...';
      case 'result':
        return 'Upload another resume';
      default:
        return 'Upload resume';
    }
  })();
  
  const isLoading = status === 'uploading' || status === 'analyzing';

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleChange}
        data-testid="resume-input"
      />
      <p className="text-lg font-semibold text-slate-700">Drop your resume here</p>
      <p className="mt-2 text-sm text-slate-500">Accepted formats: PDF or DOCX. Max size 3MB.</p>
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {buttonLabel}
      </button>
      {error && <p className="mt-4 text-sm text-red-600" data-testid="resume-error">{error}</p>}
      {result && status === 'result' && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="text-sm font-semibold text-slate-600">Latest Score</p>
          <p className="text-2xl font-semibold text-slate-900">{result.total}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{result.verdict}</p>
        </div>
      )}
    </div>
  );
}
