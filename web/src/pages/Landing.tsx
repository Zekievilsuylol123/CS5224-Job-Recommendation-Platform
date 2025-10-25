import { Link } from 'react-router-dom';

export default function LandingPage(): JSX.Element {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center">
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">EP-ready hiring radar</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">
          Find roles that welcome your Employment Pass journey.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          Upload your resume, understand your EP readiness with our Compass score, and focus on the top roles most
          likely to sponsor you in Singapore.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/assessment"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Start Self-Assessment
          </Link>
          <Link
            to="/jobs"
            className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600"
          >
            Browse EP-friendly Jobs
          </Link>
        </div>
      </div>
      <div className="flex-1 rounded-3xl border border-brand-100 bg-brand-50 p-8 shadow-inner">
        <p className="text-sm font-semibold text-brand-700">EP Compass Highlights</p>
        <ul className="mt-4 space-y-4 text-sm text-brand-900">
          <li>- Salary fit weighting tuned for Singapore&apos;s EP criteria.</li>
          <li>- Diversity and employer signals surfaced upfront.</li>
          <li>- Top-3 shortlist updates whenever your profile changes.</li>
        </ul>
        <p className="mt-6 text-xs uppercase tracking-wide text-brand-600">
          Built for ultra-lean validation — production ready, database optional.
        </p>
      </div>
    </section>
  );
}
