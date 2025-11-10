// LinkedIn Profile Scraper Integration

import { logger } from '../logger.js';
import type { LinkedInProfile, ParsedKnowledgeData } from './types.js';

const APIFY_API_URL = 'https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items';

export async function fetchLinkedInProfile(url: string): Promise<LinkedInProfile> {
  const apiToken = process.env.APIFY_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }
  
  logger.info(`Fetching LinkedIn profile: ${url}`);
  
  try {
    const response = await fetch(`${APIFY_API_URL}?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        includeEmail: true,
        username: url,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`LinkedIn scraper API failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data returned from LinkedIn scraper');
    }
    
    logger.info(`Successfully fetched LinkedIn profile for ${data[0].basic_info?.fullname}`);
    return data[0];
  } catch (error) {
    logger.error('Failed to fetch LinkedIn profile:', error);
    throw new Error(`Failed to scrape LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function normalizeLinkedInToKnowledge(data: LinkedInProfile): ParsedKnowledgeData {
  const { basic_info, experience, education, certifications, languages } = data;
  
  // Extract skills from all experiences
  const skills = new Set<string>();
  experience.forEach((exp) => {
    exp.skills?.forEach((skill) => skills.add(skill));
  });
  
  return {
    name: basic_info.fullname,
    email: basic_info.email,
    location: basic_info.location.full,
    summary: basic_info.headline,
    about: basic_info.about,
    
    skills: Array.from(skills),
    
    experience: experience.map((exp) => ({
      job_title: exp.title,
      company: exp.company,
      location: exp.location,
      description: exp.description || '',
      duration: exp.duration,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_current: exp.is_current,
      skills: exp.skills,
    })),
    
    education: education.map((edu) => ({
      institution: edu.school,
      degree: edu.degree_name,
      field_of_study: edu.field_of_study,
      duration: edu.duration,
      start_date: edu.start_date,
      end_date: edu.end_date,
    })),
    
    certifications: certifications?.map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
      issued_date: cert.issued_date,
    })),
    
    languages: languages?.map((lang) => ({
      language: lang.language,
      proficiency: lang.proficiency,
    })),
    
    linkedin_profile_url: basic_info.profile_url,
  };
}

export async function scrapeAndParseLinkedIn(url: string): Promise<{
  raw: LinkedInProfile;
  parsed: ParsedKnowledgeData;
}> {
  const raw = await fetchLinkedInProfile(url);
  const parsed = normalizeLinkedInToKnowledge(raw);
  
  return { raw, parsed };
}
