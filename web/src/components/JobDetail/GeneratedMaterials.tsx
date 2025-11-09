import { FileText, Download } from 'lucide-react';
import type { GeneratedMaterial } from '../../api/client';

interface GeneratedMaterialsProps {
  materials: GeneratedMaterial[];
  onGenerateResume: () => void;
  onGenerateCoverLetter: () => void;
  onViewMaterials: () => void;
  isGeneratingResume: boolean;
  isGeneratingCoverLetter: boolean;
}

export default function GeneratedMaterials({
  materials,
  onGenerateResume,
  onGenerateCoverLetter,
  onViewMaterials,
  isGeneratingResume,
  isGeneratingCoverLetter
}: GeneratedMaterialsProps) {
  return (
    <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-card">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Application Materials</h3>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
        <button
          type="button"
          onClick={onGenerateResume}
          disabled={isGeneratingResume}
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGeneratingResume ? 'Generating...' : 'Generate Resume'}
        </button>
        <button
          type="button"
          onClick={onGenerateCoverLetter}
          disabled={isGeneratingCoverLetter}
          className="inline-flex items-center justify-center rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:border-purple-300 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <FileText className="mr-2 h-4 w-4" />
          {isGeneratingCoverLetter ? 'Generating...' : 'Generate Cover Letter'}
        </button>
        {materials.length > 0 && (
          <button
            type="button"
            onClick={onViewMaterials}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
          >
            <Download className="mr-2 h-4 w-4" />
            View Materials ({materials.length})
          </button>
        )}
      </div>
    </div>
  );
}
