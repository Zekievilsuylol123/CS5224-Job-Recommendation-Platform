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

// Map keys to their note identifiers (what appears in the actual notes from API)
const NOTE_IDENTIFIERS: Record<keyof CompassBreakdown, string[]> = {
  salary: ['C1 Salary', 'salary'],
  qualifications: ['C2 Qualifications', 'qualifications'],
  diversity: ['C3 Diversity', 'diversity'],
  support: ['C4 Support', 'support'],
  skills: ['C5 Skills', 'skills bonus'],
  strategic: ['C6 Strategic', 'strategic']
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
          // Find the note that corresponds to this criterion
          const identifiers = NOTE_IDENTIFIERS[key];
          const note = score.notes.find((item) => 
            identifiers.some(id => item.toLowerCase().includes(id.toLowerCase()))
          ) ?? 'No detailed note available.';
          
          return (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">{LABELS[key]}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {value}
                <span className="text-base text-slate-400 ml-1">pts</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </div>
          );
        })}
    </div>
  );
}
