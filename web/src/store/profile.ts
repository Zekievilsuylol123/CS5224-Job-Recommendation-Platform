import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Application,
  EducationEntry,
  ExperienceEntry,
  ParsedProfile,
  PlanTier,
  User
} from '../types';

export interface BasicInfo {
  name: string;
  gender?: string;
  nationality?: string;
  educationLevel: 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';
  plan: PlanTier;
}

export type StoredProfile = Partial<User> & { skills: string[] };

interface ProfileState {
  basicInfo: BasicInfo;
  profile?: StoredProfile;
  parsedProfile?: ParsedProfile;
  applications: Application[];
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  setBasicInfo: (info: Partial<BasicInfo>) => void;
  setProfile: (profile: StoredProfile) => void;
  mergeProfile: (profile: Partial<StoredProfile>) => void;
  setParsedProfile: (profile?: ParsedProfile) => void;
  addApplication: (application: Application) => void;
  setApplications: (applications: Application[]) => void;
  resetApplications: () => void;
  setEducation: (items: EducationEntry[]) => void;
  setExperiences: (items: ExperienceEntry[]) => void;
}

const defaultBasicInfo: BasicInfo = {
  name: '',
  educationLevel: 'Bachelors',
  plan: 'freemium'
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      basicInfo: defaultBasicInfo,
      applications: [],
      education: [],
      experiences: [],
      setBasicInfo: (info) =>
        set((state) => ({
          basicInfo: { ...state.basicInfo, ...info }
        })),
      setProfile: (profile) =>
        set(() => ({
          profile: { ...profile, skills: profile.skills ?? [] }
        })),
      mergeProfile: (profile) =>
        set((state) => {
          const mergedSkills = [
            ...new Set([...(state.profile?.skills ?? []), ...(profile.skills ?? [])])
          ];
          return {
            profile: {
              ...state.profile,
              ...profile,
              skills: mergedSkills
            }
          };
        }),
      parsedProfile: undefined,
      setParsedProfile: (profile) => set({ parsedProfile: profile }),
      addApplication: (application) =>
        set((state) => ({
          applications: [application, ...state.applications]
        })),
      setApplications: (applications) => set({ applications }),
      resetApplications: () => set({ applications: [] }),
      setEducation: (items) => set({ education: items }),
      setExperiences: (items) => set({ experiences: items })
    }),
    {
      name: 'ep-aware-profile',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        basicInfo: state.basicInfo,
        profile: state.profile,
        applications: state.applications,
        education: state.education,
        experiences: state.experiences
      })
    }
  )
);
