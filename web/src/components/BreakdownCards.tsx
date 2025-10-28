import type { CompassBreakdown, CompassScore } from '../types';

interface Props {
  score?: CompassScore;
}

const LABELS: Record<keyof CompassBreakdown, string> = {
  salary: 'C1 · Salary',
  qualifications: 'C2 · Qualifications',
  diversity: 'C3 · Diversity',
  support: 'C4 · Support for Local Employment',
  skills: 'C5 · Skills Bonus',
  strategic: 'C6 · Strategic Bonus'
};

export default function BreakdownCards({ score }: Props): JSX.Element | null {
  if (!score) return null;

  const entries = Object.entries(score.breakdown) as Array<[keyof CompassBreakdown, number]>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries
        .filter(([key, value]) => {
          if (key === 'skills' || key === 'strategic') {
            return value > 0;
          }
          return true;
        })
        .map(([key, value]) => {
          const note =
            score.notes.find((item) => item.toLowerCase().includes(key)) ?? score.notes[0] ?? 'No notes yet.';
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">{LABELS[key]}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </div>
          );
        })}
    </div>
  );
}
