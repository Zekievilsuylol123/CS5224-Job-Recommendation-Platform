import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJob, fetchJobs, type JobsQueryParams } from '../api/client';
import { useProfileStore } from '../store/profile';

function profileKey(profile: ReturnType<typeof useProfileStore.getState>['profile']) {
  if (!profile) return 'none';
  return JSON.stringify({
    plan: profile.plan,
    educationLevel: profile.educationLevel,
    skills: profile.skills?.slice().sort()
  });
}

export function useJobs(params: JobsQueryParams) {
  const profile = useProfileStore((state) => state.profile);
  const key = useMemo(() => profileKey(profile), [profile]);

  return useQuery({
    queryKey: ['jobs', params, key],
    queryFn: () => fetchJobs(params)
  });
}

export function useTopJobs() {
  return useJobs({ limit: 3 });
}

export function useJobDetail(id?: string) {
  const profile = useProfileStore((state) => state.profile);
  const key = useMemo(() => profileKey(profile), [profile]);

  return useQuery({
    queryKey: ['job', id, key],
    queryFn: () => fetchJob(id ?? ''),
    enabled: Boolean(id)
  });
}
