import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { fetchKnowledgeSources } from '../api/client';

export default function LandingPage(): JSX.Element {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserProfile();
    }
  }, [user]);

  const checkUserProfile = async () => {
    setIsCheckingProfile(true);
    try {
      const { sources } = await fetchKnowledgeSources();
      
      // New users (no sources) should go to knowledge base to start onboarding
      // Existing users go to dashboard
      if (sources.length === 0) {
        navigate('/knowledge-base');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // If error fetching, route to knowledge base for new users to start setup
      console.error('Error checking profile:', err);
      navigate('/knowledge-base');
    } finally {
      setIsCheckingProfile(false);
    }
  };

  if (user && isCheckingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center">
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Your personal Chief Talent Officer</p>
        <h1 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">
          Context-aware AI that knows you deeply
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600">
          Add your knowledge sources—resume, LinkedIn, GitHub, and more—and let our AI deeply understand your unique background to find perfectly tailored jobs and craft personalized resumes, cover letters, and HR outreach.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 hover:text-white z-10"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/jobs"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                Browse Jobs
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 hover:text-white z-10"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 rounded-3xl border border-brand-100 bg-brand-50 p-8 shadow-inner">
        <p className="text-sm font-semibold text-brand-700">Platform Highlights</p>
        <ul className="mt-4 space-y-4 text-sm text-brand-900">
          <li>- AI-powered job matching based on your complete professional profile</li>
          <li>- Generate tailored resumes and cover letters for each application</li>
          <li>- Direct HR contact search to increase your success rate</li>
        </ul>
        <p className="mt-6 text-xs uppercase tracking-wide text-brand-600">
          Your Personal Chief Talent Officer
        </p>
      </div>
    </section>
  );
}
