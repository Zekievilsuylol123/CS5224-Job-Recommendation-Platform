import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { useProfileStore } from '../store/profile';
import type { EducationEntry, ExperienceEntry, PlanTier } from '../types';

type ActiveModal = 'profile' | 'education' | 'experience' | null;

const planLabels: Record<PlanTier, string> = {
  freemium: 'Freemium',
  standard: 'Standard',
  pro: 'Pro',
  ultimate: 'Ultimate'
};

const createId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 11)}`;

const initialsFor = (name: string): string => {
  const parts = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return 'ME';
  }
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export default function ProfileMenu(): JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profile = useProfileStore((state) => state.profile);
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const education = useProfileStore((state) => state.education);
  const experiences = useProfileStore((state) => state.experiences);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const displayName = profile?.name?.trim() || basicInfo.name?.trim() || 'Your profile';
  const plan = basicInfo.plan ?? 'freemium';
  const avatarInitials = useMemo(() => initialsFor(displayName), [displayName]);
  const profileSubtitle = useMemo(() => {
    if (profile?.nationality && profile?.yearsExperience != null) {
      return `${profile.nationality} · ${profile.yearsExperience} yrs experience`;
    }
    if (profile?.yearsExperience != null) {
      return `${profile.yearsExperience} yrs experience`;
    }
    if (profile?.nationality) {
      return profile.nationality;
    }
    return 'Complete your profile';
  }, [profile]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [menuOpen]);

  const openModal = (modal: Exclude<ActiveModal, null>): void => {
    setActiveModal(modal);
    setMenuOpen(false);
  };

  const closeModal = (): void => setActiveModal(null);

  const recentEducation = education.slice(0, 2);
  const recentExperience = experiences.slice(0, 2);

  return (
    <Fragment>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {avatarInitials}
          </span>
          <span>Me</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.094l3.71-3.864a.75.75 0 1 1 1.08 1.04l-4.25 4.425a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1-.02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-40 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-base font-semibold text-brand-700">
                  {avatarInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{profileSubtitle}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-700">Plan · {planLabels[plan]}</p>
                <p className="mt-1">
                  {profile?.skills?.length
                    ? `${profile.skills.length} skills saved`
                    : 'Add your core skills to improve matches'}
                </p>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account</p>
              <button
                type="button"
                onClick={() => openModal('profile')}
                className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>Edit personal profile</span>
                <span className="text-xs text-slate-400">basic info</span>
              </button>
            </div>
            <div className="border-t border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Career journey</p>
              <button
                type="button"
                onClick={() => openModal('education')}
                className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>Manage education</span>
                <span className="text-xs text-slate-400">
                  {education.length ? `${education.length} entries` : 'add now'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openModal('experience')}
                className="mt-1.5 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>Manage experience</span>
                <span className="text-xs text-slate-400">
                  {experiences.length ? `${experiences.length} entries` : 'add now'}
                </span>
              </button>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              {recentExperience.length > 0 && (
                <div className="mb-3">
                  <p className="font-semibold text-slate-600">Latest experience</p>
                  {recentExperience.map((item) => (
                    <p key={item.id} className="mt-1">
                      <span className="font-medium text-slate-700">{item.title}</span>
                      {item.company ? ` · ${item.company}` : ''}
                    </p>
                  ))}
                </div>
              )}
              {recentEducation.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-600">Latest education</p>
                  {recentEducation.map((item) => (
                    <p key={item.id} className="mt-1">
                      <span className="font-medium text-slate-700">{item.degree}</span>
                      {item.school ? ` · ${item.school}` : ''}
                    </p>
                  ))}
                </div>
              )}
              {!recentEducation.length && !recentExperience.length && (
                <p>Complete your experience and education to refine job matches.</p>
              )}
            </div>
          </div>
        )}
      </div>
      <PersonalProfileModal open={activeModal === 'profile'} onClose={closeModal} />
      <EducationModal open={activeModal === 'education'} onClose={closeModal} />
      <ExperienceModal open={activeModal === 'experience'} onClose={closeModal} />
    </Fragment>
  );
}

interface PersonalProfileModalProps {
  open: boolean;
  onClose: () => void;
}

function PersonalProfileModal({ open, onClose }: PersonalProfileModalProps): JSX.Element {
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const profile = useProfileStore((state) => state.profile);
  const setBasicInfo = useProfileStore((state) => state.setBasicInfo);
  const mergeProfile = useProfileStore((state) => state.mergeProfile);
  const [formState, setFormState] = useState(() => ({
    name: basicInfo.name || '',
    plan: basicInfo.plan,
    educationLevel: basicInfo.educationLevel,
    gender: profile?.gender ?? '',
    nationality: profile?.nationality ?? '',
    yearsExperience: profile?.yearsExperience?.toString() ?? '',
    expectedSalarySGD: profile?.expectedSalarySGD?.toString() ?? '',
    skills: (profile?.skills ?? []).join(', ')
  }));

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormState({
      name: basicInfo.name || '',
      plan: basicInfo.plan,
      educationLevel: basicInfo.educationLevel,
      gender: profile?.gender ?? '',
      nationality: profile?.nationality ?? '',
      yearsExperience: profile?.yearsExperience?.toString() ?? '',
      expectedSalarySGD: profile?.expectedSalarySGD?.toString() ?? '',
      skills: (profile?.skills ?? []).join(', ')
    });
  }, [open, basicInfo, profile]);

  const updateField = (key: keyof typeof formState, value: string): void => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setBasicInfo({
      name: formState.name.trim(),
      plan: formState.plan,
      educationLevel: formState.educationLevel
    });

    const parsedYears = formState.yearsExperience ? Number(formState.yearsExperience) : undefined;
    const parsedSalary = formState.expectedSalarySGD ? Number(formState.expectedSalarySGD) : undefined;
    const skills = formState.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    mergeProfile({
      name: formState.name.trim(),
      gender: formState.gender.trim() || undefined,
      nationality: formState.nationality.trim() || undefined,
      yearsExperience: Number.isFinite(parsedYears ?? NaN) ? parsedYears : undefined,
      expectedSalarySGD: Number.isFinite(parsedSalary ?? NaN) ? parsedSalary : undefined,
      skills
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit personal profile"
      description="Keep your profile current so the recommendation engine stays accurate."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="personal-profile-form"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Save changes
          </button>
        </div>
      }
    >
      <form id="personal-profile-form" onSubmit={handleSubmit} className="space-y-5 text-sm text-slate-700">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</span>
            <input
              required
              type="text"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan tier</span>
            <select
              value={formState.plan}
              onChange={(event) => updateField('plan', event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {Object.entries(planLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education level</span>
            <select
              value={formState.educationLevel}
              onChange={(event) => updateField('educationLevel', event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {['Diploma', 'Bachelors', 'Masters', 'PhD'].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</span>
            <input
              type="text"
              value={formState.gender}
              onChange={(event) => updateField('gender', event.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nationality</span>
            <input
              type="text"
              value={formState.nationality}
              onChange={(event) => updateField('nationality', event.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total years of experience
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formState.yearsExperience}
              onChange={(event) => updateField('yearsExperience', event.target.value)}
              placeholder="e.g. 4"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expected salary (SGD)
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={formState.expectedSalarySGD}
              onChange={(event) => updateField('expectedSalarySGD', event.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Skills (comma separated)
          </span>
          <textarea
            rows={3}
            value={formState.skills}
            onChange={(event) => updateField('skills', event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Product management, user research, SQL"
          />
        </label>
      </form>
    </Modal>
  );
}

interface StructuredModalProps {
  open: boolean;
  onClose: () => void;
}

function EducationModal({ open, onClose }: StructuredModalProps): JSX.Element {
  const education = useProfileStore((state) => state.education);
  const setEducation = useProfileStore((state) => state.setEducation);
  const [drafts, setDrafts] = useState<EducationEntry[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts(education.map((entry) => ({ ...entry })));
    }
  }, [open, education]);

  const updateDraft = (id: string, changes: Partial<EducationEntry>): void => {
    setDrafts((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const addDraft = (): void => {
    setDrafts((prev) => [
      ...prev,
      {
        id: createId(),
        school: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        currentlyStudying: false,
        description: ''
      }
    ]);
  };

  const removeDraft = (id: string): void => {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const cleanEntries = drafts
      .map((entry) => ({
        ...entry,
        school: entry.school.trim(),
        degree: entry.degree.trim(),
        fieldOfStudy: entry.fieldOfStudy?.trim() || undefined,
        startDate: entry.startDate,
        endDate: entry.currentlyStudying ? undefined : entry.endDate || undefined,
        description: entry.description?.trim() || undefined
      }))
      .filter((entry) => entry.school && entry.degree);
    setEducation(cleanEntries);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage education"
      description="Document your academic milestones so recruiters understand your foundation."
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addDraft}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:border-brand-500 hover:text-brand-700"
          >
            <span className="text-base leading-none">+</span>
            Add education
          </button>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="education-form"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Save education
            </button>
          </div>
        </div>
      }
    >
      <form id="education-form" onSubmit={handleSubmit} className="space-y-5 text-sm text-slate-700">
        {drafts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No education added yet. Use “Add education” to capture your academic background.
          </div>
        )}
        {drafts.map((entry, index) => (
          <section key={entry.id} className="rounded-xl border border-slate-200 px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Education {index + 1}
              </h3>
              <button
                type="button"
                onClick={() => removeDraft(entry.id)}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Remove education entry"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Institution</span>
                <input
                  type="text"
                  value={entry.school}
                  onChange={(event) => updateDraft(entry.id, { school: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="National University of Singapore"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Degree</span>
                <input
                  type="text"
                  value={entry.degree}
                  onChange={(event) => updateDraft(entry.id, { degree: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Master of Computing"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Field of study
                </span>
                <input
                  type="text"
                  value={entry.fieldOfStudy ?? ''}
                  onChange={(event) => updateDraft(entry.id, { fieldOfStudy: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Information Systems"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
                <label className="flex flex-col gap-1 sm:col-span-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</span>
                  <input
                    type="month"
                    value={entry.startDate}
                    onChange={(event) => updateDraft(entry.id, { startDate: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">End date</span>
                  <input
                    type="month"
                    value={entry.endDate ?? ''}
                    onChange={(event) => updateDraft(entry.id, { endDate: event.target.value })}
                    disabled={entry.currentlyStudying}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(entry.currentlyStudying)}
                  onChange={(event) =>
                    updateDraft(entry.id, {
                      currentlyStudying: event.target.checked,
                      endDate: event.target.checked ? '' : entry.endDate
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs font-medium text-slate-600">I&apos;m currently studying here</span>
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highlights</span>
              <textarea
                rows={3}
                value={entry.description ?? ''}
                onChange={(event) => updateDraft(entry.id, { description: event.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Dean’s list, leadership roles, or standout coursework."
              />
            </label>
          </section>
        ))}
      </form>
    </Modal>
  );
}

function ExperienceModal({ open, onClose }: StructuredModalProps): JSX.Element {
  const experiences = useProfileStore((state) => state.experiences);
  const setExperiences = useProfileStore((state) => state.setExperiences);
  const [drafts, setDrafts] = useState<ExperienceEntry[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts(experiences.map((entry) => ({ ...entry })));
    }
  }, [open, experiences]);

  const updateDraft = (id: string, changes: Partial<ExperienceEntry>): void => {
    setDrafts((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const addDraft = (): void => {
    setDrafts((prev) => [
      ...prev,
      {
        id: createId(),
        title: '',
        company: '',
        employmentType: '',
        location: '',
        startDate: '',
        endDate: '',
        currentlyWorking: false,
        description: ''
      }
    ]);
  };

  const removeDraft = (id: string): void => {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const cleanEntries = drafts
      .map((entry) => ({
        ...entry,
        title: entry.title.trim(),
        company: entry.company.trim(),
        employmentType: entry.employmentType?.trim() || undefined,
        location: entry.location?.trim() || undefined,
        startDate: entry.startDate,
        endDate: entry.currentlyWorking ? undefined : entry.endDate || undefined,
        description: entry.description?.trim() || undefined
      }))
      .filter((entry) => entry.title && entry.company);
    setExperiences(cleanEntries);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage experience"
      description="Showcase the professional milestones that best tell your story."
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addDraft}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:border-brand-500 hover:text-brand-700"
          >
            <span className="text-base leading-none">+</span>
            Add role
          </button>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="experience-form"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Save experience
            </button>
          </div>
        </div>
      }
    >
      <form id="experience-form" onSubmit={handleSubmit} className="space-y-5 text-sm text-slate-700">
        {drafts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No experience added yet. Use “Add role” to outline your professional history.
          </div>
        )}
        {drafts.map((entry, index) => (
          <section key={entry.id} className="rounded-xl border border-slate-200 px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role {index + 1}
              </h3>
              <button
                type="button"
                onClick={() => removeDraft(entry.id)}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Remove experience entry"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10 5.22 6.28a.75.75 0 0 1 0-1.06"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
                <input
                  type="text"
                  value={entry.title}
                  onChange={(event) => updateDraft(entry.id, { title: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Product Manager"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</span>
                <input
                  type="text"
                  value={entry.company}
                  onChange={(event) => updateDraft(entry.id, { company: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Accenture"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employment type
                </span>
                <input
                  type="text"
                  value={entry.employmentType ?? ''}
                  onChange={(event) => updateDraft(entry.id, { employmentType: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Full-time, internship, contract"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
                <input
                  type="text"
                  value={entry.location ?? ''}
                  onChange={(event) => updateDraft(entry.id, { location: event.target.value })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Singapore · Hybrid"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
                <label className="flex flex-col gap-1 sm:col-span-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start date</span>
                  <input
                    type="month"
                    value={entry.startDate}
                    onChange={(event) => updateDraft(entry.id, { startDate: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">End date</span>
                  <input
                    type="month"
                    value={entry.endDate ?? ''}
                    onChange={(event) => updateDraft(entry.id, { endDate: event.target.value })}
                    disabled={entry.currentlyWorking}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(entry.currentlyWorking)}
                  onChange={(event) =>
                    updateDraft(entry.id, {
                      currentlyWorking: event.target.checked,
                      endDate: event.target.checked ? '' : entry.endDate
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs font-medium text-slate-600">I&apos;m currently in this role</span>
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key outcomes</span>
              <textarea
                rows={4}
                value={entry.description ?? ''}
                onChange={(event) => updateDraft(entry.id, { description: event.target.value })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                placeholder="Highlight achievements, leadership, and measurable impact."
              />
            </label>
          </section>
        ))}
      </form>
    </Modal>
  );
}
