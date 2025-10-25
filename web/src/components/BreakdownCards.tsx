import type { CompassScore } from '../types';

interface Props {
  score?: CompassScore;
}

const labels: Record<keyof CompassScore['breakdown'], string> = {
  salary: 'Salary Fit',
  qualifications: 'Qualifications',
  employer: 'Employer',
  diversity: 'Diversity'
};

export default function BreakdownCards({ score }: Props): JSX.Element | null {
  if (!score) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(Object.keys(labels) as Array<keyof CompassScore['breakdown']>).map((key) => {
        const note =
          score.notes.find((item) => item.toLowerCase().includes(key)) ?? score.notes[0] ?? 'No notes yet.';
        return (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">{labels[key]}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{score.breakdown[key]}</p>
            <p className="mt-2 text-xs text-slate-500">{note}</p>
          </div>
        );
      })}
    </div>
  );
}
