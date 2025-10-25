import { useRef } from 'react';
import type { CompassScore } from '../types';

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_BYTES = 3 * 1024 * 1024;

type Status = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

interface Props {
  status: Status;
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
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'uploading' || status === 'analyzing'}
      >
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
