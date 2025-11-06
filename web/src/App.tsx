import { Link, NavLink, Route, Routes } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import SelfAssessmentPage from './pages/SelfAssessment';
import DashboardPage from './pages/Dashboard';
import JobsListPage from './pages/JobsList';
import JobDetailPage from './pages/JobDetail';
import ApplicationsPage from './pages/Applications';
import ProfileMenu from './components/ProfileMenu';
import UserMenu from './components/UserMenu';
import ResumeUploadButton from './components/ResumeUploadButton';
import { useAuthStore } from './store/auth';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
  ].join(' ');

export default function App(): JSX.Element {
  const { user } = useAuthStore();

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        {user && (
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
              <div className="flex items-center gap-3">
                <ResumeUploadButton />
                <UserMenu />
              </div>
            </div>
          </header>
        )}
        <main className="flex-1 bg-slate-50">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <SelfAssessmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:id"
              element={
                <ProtectedRoute>
                  <JobDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        {user && (
          <footer className="border-t bg-white">
            <div className="mx-auto max-w-6xl px-6 py-4 text-sm text-slate-500">
              &copy; {new Date().getFullYear()} EP-Aware Jobs. Built for ultra-lean MVP validation.
            </div>
          </footer>
        )}
      </div>
    </AuthProvider>
  );
}
