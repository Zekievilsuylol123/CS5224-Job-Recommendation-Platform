import type { ParsedProfile, User } from '../types';

interface Props {
  profile?: Partial<User> | ParsedProfile;
  title?: string;
}

function renderChip(label: string, value?: string | number): JSX.Element | null {
  if (!value) return null;
  return (
    <span
      key={`${label}-${value}`}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
    >
      <span className="font-semibold text-slate-500">{label}</span>
      {value}
    </span>
  );
}

export default function ProfileChips({ profile, title = 'Profile Highlights' }: Props): JSX.Element | null {
  if (!profile) return null;
  const skills = profile.skills ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {renderChip('Education', (profile as Partial<User>).educationLevel)}
        {renderChip('Experience', profile.yearsExperience ? `${profile.yearsExperience} yrs` : undefined)}
        {renderChip('Salary', profile.expectedSalarySGD ? `$${profile.expectedSalarySGD}` : undefined)}
        {renderChip('Nationality', profile.nationality)}
        {renderChip('Gender', profile.gender)}
        {renderChip('Last Title', (profile as ParsedProfile).lastTitle)}
        {renderChip('Email', (profile as ParsedProfile).email)}
        {skills.length > 0 &&
          skills.map((skill) => (
            <span
              key={`skill-${skill}`}
              className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
            >
              {skill}
            </span>
          ))}
        {skills.length === 0 && <span className="text-xs text-slate-400">No skills detected yet.</span>}
      </div>
    </section>
  );
}
