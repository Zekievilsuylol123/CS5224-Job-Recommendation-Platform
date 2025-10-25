import { Link, NavLink, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/Landing';
import SelfAssessmentPage from './pages/SelfAssessment';
import DashboardPage from './pages/Dashboard';
import JobsListPage from './pages/JobsList';
import JobDetailPage from './pages/JobDetail';
import ApplicationsPage from './pages/Applications';
import { useProfileStore } from './store/profile';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
  ].join(' ');

export default function App(): JSX.Element {
  const profile = useProfileStore((state) => state.profile);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-semibold text-brand-600">
            EP-Aware Jobs
          </Link>
          <nav className="flex gap-2">
            <NavLink to="/assessment" className={navLinkClass}>
              Self-Assessment
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/jobs" className={navLinkClass}>
              Jobs
            </NavLink>
            <NavLink to="/applications" className={navLinkClass}>
              Applications
            </NavLink>
          </nav>
          <div className="hidden text-sm text-slate-500 sm:block">
            {profile?.name ? `Welcome, ${profile.name}` : 'No profile saved'}
          </div>
        </div>
      </header>
      <main className="flex-1 bg-slate-50">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/assessment" element={<SelfAssessmentPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/jobs" element={<JobsListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Routes>
      </main>
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} EP-Aware Jobs. Built for ultra-lean MVP validation.
        </div>
      </footer>
    </div>
  );
}
