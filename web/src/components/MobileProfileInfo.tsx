import { useAuthStore } from '../store/auth';
import { useProfileStore } from '../store/profile';

const initialsFor = (name: string): string => {
  const parts = name.split(' ').filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'U';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

export default function MobileProfileInfo(): JSX.Element {
  const { user, signOut } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);
  const basicInfo = useProfileStore((state) => state.basicInfo);

  const displayName = user?.user_metadata?.full_name || profile?.name || basicInfo?.name || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const avatarInitials = initialsFor(displayName);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-start gap-3 mb-4">
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
          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
          {profile?.nationality && profile?.yearsExperience != null && (
            <p className="text-xs text-slate-600 mt-1">
              {profile.nationality} · {profile.yearsExperience} yrs exp
            </p>
          )}
          {profile?.educationLevel && (
            <div className="mt-2 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {profile.educationLevel}
            </div>
          )}
        </div>
      </div>

      {profile?.latestCompassScore && (
        <div className="rounded-lg bg-white border border-slate-200 p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Latest Score</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {profile.latestCompassScore.totalRaw ?? profile.latestCompassScore.total}/110
              </p>
            </div>
            <div className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              profile.latestCompassScore.verdict === 'Likely' ? 'bg-green-100 text-green-700' :
              profile.latestCompassScore.verdict === 'Borderline' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {profile.latestCompassScore.verdict}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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
  );
}
