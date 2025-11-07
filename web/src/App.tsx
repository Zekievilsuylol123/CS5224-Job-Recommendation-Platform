import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
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
import MobileProfileInfo from './components/MobileProfileInfo';
import { useAuthStore } from './store/auth';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
  ].join(' ');

export default function App(): JSX.Element {
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        {user && (
          <header className="border-b bg-white sticky top-0 z-30">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <Link to="/" className="text-lg sm:text-xl font-semibold text-brand-600 flex-shrink-0">
                EP-Aware Jobs
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-2">
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
              
              {/* Desktop User Menu */}
              <div className="hidden md:flex items-center gap-3">
                <UserMenu />
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-slate-200">
                <div className="space-y-1 px-4 pb-3 pt-2">
                  <NavLink
                    to="/assessment"
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-brand-100 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Self-Assessment
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-brand-100 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/jobs"
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-brand-100 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Jobs
                  </NavLink>
                  <NavLink
                    to="/applications"
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-brand-100 text-brand-800'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Applications
                  </NavLink>
                  
                  {/* Mobile Profile Info - Always Visible */}
                  <div className="pt-4 mt-3 border-t border-slate-200">
                    <MobileProfileInfo />
                  </div>
                </div>
              </div>
            )}
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
