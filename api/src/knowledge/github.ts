// GitHub Profile Parser

import { logger } from '../logger.js';
import type { GitHubProfile, GitHubRepo, GitHubData, ParsedKnowledgeData } from './types.js';

const GITHUB_API_URL = 'https://api.github.com';

export async function fetchGitHubProfile(username: string): Promise<GitHubData> {
  logger.info(`Fetching GitHub profile: ${username}`);
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Job-Recommendation-Platform',
  };
  
  // Use personal token if available for higher rate limits
  const githubToken = process.env.GITHUB_PERSONAL_TOKEN;
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }
  
  try {
    // Fetch profile
    const profileResponse = await fetch(`${GITHUB_API_URL}/users/${username}`, { headers });
    
    if (!profileResponse.ok) {
      if (profileResponse.status === 404) {
        throw new Error(`GitHub user '${username}' not found`);
      }
      throw new Error(`GitHub API failed: ${profileResponse.status} ${profileResponse.statusText}`);
    }
    
    const profile = (await profileResponse.json()) as GitHubProfile;

    
    // Fetch repositories (sorted by recent updates, limit to 50)
    const reposResponse = await fetch(
      `${GITHUB_API_URL}/users/${username}/repos?sort=updated&per_page=50`,
      { headers }
    );
    
    if (!reposResponse.ok) {
      logger.warn(`Failed to fetch repos for ${username}, using empty array`);
    }
    
    const repos = reposResponse.ok
      ? (await reposResponse.json()) as GitHubRepo[]
      : [];

    
    logger.info(`Successfully fetched GitHub profile for ${profile.name || username} with ${repos.length} repos`);
    
    return { profile, repos };
  } catch (error) {
    logger.error('Failed to fetch GitHub profile:', error);
    throw new Error(`Failed to fetch GitHub profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractSkillsFromRepos(repos: GitHubRepo[]): string[] {
  const skillCount: Record<string, number> = {};
  
  repos.forEach((repo) => {
    // Count primary language
    if (repo.language) {
      skillCount[repo.language] = (skillCount[repo.language] || 0) + 1;
    }
    
    // Count topics (tags)
    repo.topics.forEach((topic) => {
      skillCount[topic] = (skillCount[topic] || 0) + 1;
    });
  });
  
  // Sort by frequency and return top 20
  return Object.entries(skillCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([skill]) => skill);
}

export function normalizeGitHubToKnowledge(data: GitHubData): ParsedKnowledgeData {
  const { profile, repos } = data;
  
  const skills = extractSkillsFromRepos(repos);
  
  // Convert top repos to projects
  const projects = repos
    .filter((repo) => !repo.name.includes('.github.io')) // Exclude GitHub Pages repos
    .slice(0, 10)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || '',
      technologies: [repo.language, ...repo.topics].filter(Boolean) as string[],
      url: repo.html_url,
      start_date: repo.created_at,
      end_date: repo.updated_at,
    }));
  
  return {
    name: profile.name,
    email: profile.email,
    location: profile.location,
    summary: profile.bio,
    
    skills,
    
    projects,
    
    github_repos: repos.map((repo) => ({
      name: repo.name,
      description: repo.description || '',
      language: repo.language,
      topics: repo.topics,
      stars: repo.stargazers_count,
      url: repo.html_url,
    })),
    
    github_username: profile.login,
  };
}

export async function scrapeAndParseGitHub(username: string): Promise<{
  raw: GitHubData;
  parsed: ParsedKnowledgeData;
}> {
  const raw = await fetchGitHubProfile(username);
  const parsed = normalizeGitHubToKnowledge(raw);
  
  return { raw, parsed };
}

// Helper to extract username from GitHub URL
export function extractGitHubUsername(url: string): string {
  // Handle various GitHub URL formats
  // https://github.com/username
  // github.com/username
  // username
  
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\?#]+)/);
  if (match) {
    return match[1];
  }
  
  // If no match, assume it's already a username
  return url.trim();
}
