import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchProfile, saveProfile, type ProfileData } from '../api/client';
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
  isLoading: boolean;
  error: string | null;
  setBasicInfo: (info: Partial<BasicInfo>) => void;
  setProfile: (profile: StoredProfile) => void;
  mergeProfile: (profile: Partial<StoredProfile>) => void;
  setParsedProfile: (profile?: ParsedProfile) => void;
  addApplication: (application: Application) => void;
  setApplications: (applications: Application[]) => void;
  resetApplications: () => void;
  setEducation: (items: EducationEntry[]) => void;
  setExperiences: (items: ExperienceEntry[]) => void;
  // New methods for Supabase sync
  loadProfileFromDB: () => Promise<void>;
  saveProfileToDB: () => Promise<void>;
}

const defaultBasicInfo: BasicInfo = {
  name: '',
  educationLevel: 'Bachelors',
  plan: 'freemium'
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      basicInfo: defaultBasicInfo,
      applications: [],
      education: [],
      experiences: [],
      isLoading: false,
      error: null,
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
      setExperiences: (items) => set({ experiences: items }),

      // Load profile from Supabase
      loadProfileFromDB: async () => {
        set({ isLoading: true, error: null });
        try {
          const profileData = await fetchProfile();
          if (profileData) {
            set({
              profile: {
                id: profileData.id,
                name: profileData.name,
                gender: profileData.gender,
                nationality: profileData.nationality,
                educationLevel: profileData.educationLevel,
                educationInstitution: profileData.educationInstitution,
                certifications: profileData.certifications,
                yearsExperience: profileData.yearsExperience,
                skills: profileData.skills || [],
                expectedSalarySGD: profileData.expectedSalarySGD,
                plan: profileData.plan || 'freemium',
                latestCompassScore: profileData.latestCompassScore || null
              },
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load profile',
            isLoading: false
          });
        }
      },

      // Save profile to Supabase
      saveProfileToDB: async () => {
        const { profile } = get();
        if (!profile) {
          set({ error: 'No profile to save' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const savedProfile = await saveProfile({
            name: profile.name,
            gender: profile.gender,
            nationality: profile.nationality,
            educationLevel: profile.educationLevel,
            educationInstitution: profile.educationInstitution,
            certifications: profile.certifications,
            yearsExperience: profile.yearsExperience,
            skills: profile.skills,
            expectedSalarySGD: profile.expectedSalarySGD,
            plan: profile.plan
          });

          set({
            profile: {
              ...profile,
              id: savedProfile.id,
              ...savedProfile
            },
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save profile',
            isLoading: false
          });
        }
      }
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
