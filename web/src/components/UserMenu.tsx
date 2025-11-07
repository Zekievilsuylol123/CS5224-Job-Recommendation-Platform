import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useProfileStore } from '../store/profile';

const initialsFor = (name: string): string => {
  const parts = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return 'U';
  }
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export default function UserMenu(): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name || profile?.name || basicInfo?.name || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const avatarInitials = useMemo(() => initialsFor(displayName), [displayName]);
  
  // Profile details
  const profileSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (profile?.nationality) parts.push(profile.nationality);
    if (profile?.yearsExperience != null) parts.push(`${profile.yearsExperience} yrs exp`);
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [profile]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickAway = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {avatarInitials}
          </span>
        )}
        <span className="hidden sm:inline">{displayName.split(' ')[0]}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-slate-400"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 flex-shrink-0">
                  {avatarInitials}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
                {profileSubtitle && (
                  <p className="text-xs text-slate-600 mt-1">{profileSubtitle}</p>
                )}
                {profile?.educationLevel && (
                  <div className="mt-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {profile.educationLevel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {profile?.latestCompassScore && (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Latest COMPASS Score</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {profile.latestCompassScore.totalRaw ?? profile.latestCompassScore.total}/110
                  </p>
                </div>
                <div className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  profile.latestCompassScore.verdict === 'Likely' ? 'bg-green-100 text-green-700' :
                  profile.latestCompassScore.verdict === 'Borderline' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {profile.latestCompassScore.verdict}
                </div>
              </div>
            </div>
          )}

          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z"
                  clipRule="evenodd"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
