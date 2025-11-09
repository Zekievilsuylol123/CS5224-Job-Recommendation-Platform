// AI Cover Letter Generator
// Generates personalized cover letters based on knowledge base and job description

import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { logger } from '../logger.js';
import type { AggregatedKnowledgeBase } from '../knowledge/aggregator.js';
import type { JobInfo } from './resume_generator.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedCoverLetter {
  content: string; // Markdown formatted cover letter
  word_count: number;
  tone: 'formal' | 'professional' | 'enthusiastic';
  key_points: string[];
}

async function loadPrompt(filename: string): Promise<string> {
  const promptPath = path.join(process.cwd(), 'resources', 'llm_prompts', filename);
  return fs.promises.readFile(promptPath, 'utf-8');
}

/**
 * Extract key technical keywords and skills from job description
 * (Same logic as resume generator for consistency)
 */
function extractJobKeywords(job: JobInfo): {
  technical_keywords: string[];
  skill_keywords: string[];
  role_keywords: string[];
} {
  const text = `${job.title} ${job.description} ${job.requirements?.join(' ') || ''} ${job.preferred_qualifications?.join(' ') || ''}`.toLowerCase();
  
  // Common technical keywords to look for
  const technicalPatterns = [
    /\b(java|python|javascript|typescript|go|golang|rust|c\+\+|c#|ruby|php|swift|kotlin|scala|r\b|matlab)\b/gi,
    /\b(react|angular|vue|svelte|next\.?js|nuxt|gatsby|remix)\b/gi,
    /\b(spring|spring boot|django|flask|fastapi|express|nest\.?js|rails|laravel|asp\.net)\b/gi,
    /\b(postgresql|postgres|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb|sql|nosql|firestore|sqlite)\b/gi,
    /\b(aws|amazon web services|azure|gcp|google cloud|ec2|s3|lambda|cloudfront|rds|ecs|eks)\b/gi,
    /\b(docker|kubernetes|k8s|ci\/cd|jenkins|gitlab ci|github actions|terraform|ansible|helm|argocd)\b/gi,
    /\b(git|github|gitlab|bitbucket|jira|confluence|kafka|rabbitmq|graphql|rest|restful|grpc|websocket)\b/gi,
    /\b(microservices|monolith|serverless|event[- ]driven|api|soa|domain[- ]driven)\b/gi,
    /\b(spark|hadoop|airflow|pandas|numpy|scikit[- ]learn|tensorflow|pytorch|keras|jupyter)\b/gi,
    /\b(ios|android|react native|flutter|swift|objective[- ]c)\b/gi,
    /\b(jest|mocha|pytest|junit|selenium|cypress|playwright|postman)\b/gi,
  ];
  
  const skillPatterns = [
    /\b(agile|scrum|kanban|waterfall|lean|safe|xp|extreme programming)\b/gi,
    /\b(code review|pair programming|tdd|test[- ]driven|bdd|behavior[- ]driven|continuous integration|continuous deployment)\b/gi,
    /\b(leadership|mentoring|coaching|team lead|stakeholder management|cross[- ]functional)\b/gi,
    /\b(system design|software architecture|design patterns|refactoring|debugging|troubleshooting)\b/gi,
    /\b(scalability|performance optimization|load balancing|caching|distributed systems)\b/gi,
    /\b(security|authentication|authorization|encryption|oauth|jwt|ssl|tls)\b/gi,
    /\b(monitoring|logging|observability|prometheus|grafana|elk|datadog|new relic)\b/gi,
    /\b(machine learning|deep learning|nlp|computer vision|data analysis|data science|analytics|etl|data pipeline|data warehouse)\b/gi,
    /\b(a\/b testing|experimentation|metrics|kpis|dashboards|visualization)\b/gi,
  ];
  
  const rolePatterns = [
    /\b(senior|staff|principal|lead|chief|head of|director|vp|vice president|junior|mid[- ]level)\b/gi,
    /\b(full[- ]?stack|back[- ]?end|front[- ]?end|devops|sre|site reliability|platform|infrastructure|data|ml|ai)\b/gi,
    /\b(architect|engineer|developer|programmer|analyst|scientist|manager|consultant)\b/gi,
  ];
  
  const extractMatches = (patterns: RegExp[]): string[] => {
    const matches = new Set<string>();
    patterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        found.forEach(m => matches.add(m.toLowerCase()));
      }
    });
    return Array.from(matches);
  };
  
  return {
    technical_keywords: extractMatches(technicalPatterns),
    skill_keywords: extractMatches(skillPatterns),
    role_keywords: extractMatches(rolePatterns),
  };
}

/**
 * Highlight matched keywords in the generated content for ATS optimization visibility
 * Uses <mark> tags for yellow highlighting without modifying the original text
 */
function highlightMatchedKeywords(content: string, keywords: { technical_keywords: string[], skill_keywords: string[], role_keywords: string[] }): string {
  const allKeywords = [
    ...keywords.technical_keywords,
    ...keywords.skill_keywords,
    ...keywords.role_keywords,
  ];
  
  if (allKeywords.length === 0) return content;
  
  let processedContent = content;
  const sortedKeywords = [...new Set(allKeywords)].sort((a, b) => b.length - a.length);
  
  sortedKeywords.forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?<!<mark>)(?<!\`)\\b(${escapedKeyword})\\b(?!\`)(?![^<]*<\/mark>)(?![^\\s]*@)(?![^\\s]*\\.(com|org|net|io))`,
      'gi'
    );
    processedContent = processedContent.replace(regex, '<mark>$1</mark>');
  });
  
  return processedContent;
}

export async function generateCoverLetter(
  knowledgeBase: AggregatedKnowledgeBase,
  job: JobInfo,
  tone: 'formal' | 'professional' | 'enthusiastic' = 'professional'
): Promise<GeneratedCoverLetter> {
  logger.info(`Generating cover letter for ${job.title} at ${job.company}`);
  
  try {
    const prompt = await loadPrompt('generate_cover_letter.txt');
    
    // Prepare relevant context from knowledge base
    const relevantContext = {
      name: knowledgeBase.name,
      email: knowledgeBase.email,
      phone: knowledgeBase.phone,
      linkedin: knowledgeBase.linkedin_profile_url,
      summary: knowledgeBase.summary,
      recent_experience: knowledgeBase.experience.slice(0, 3).map((exp) => ({
        job_title: exp.job_title,
        company: exp.company,
        duration: exp.duration,
        key_achievements: exp.description.slice(0, 300),
      })),
      top_skills: knowledgeBase.skills.slice(0, 10),
      education: knowledgeBase.education.slice(0, 2).map((edu) => ({
        degree: edu.degree,
        field_of_study: edu.field_of_study,
        institution: edu.institution,
      })),
      notable_projects: knowledgeBase.projects.slice(0, 3).map((proj) => ({
        name: proj.name,
        description: proj.description.slice(0, 200),
        technologies: proj.technologies,
      })),
    };
    
    // Debug logging - Contact info
    logger.info('Cover letter generation - Contact info:', {
      name: relevantContext.name,
      email: relevantContext.email,
      phone: relevantContext.phone,
      linkedin: relevantContext.linkedin,
    });
    
    const jobSummary = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description, // Full JD for better context
      key_requirements: job.requirements,
    };
    
    // Extract key keywords from JD for targeted tailoring
    const jobKeywords = extractJobKeywords(job);
    
    // Detailed logging of what we're sending to LLM
    logger.info('=== COVER LETTER GENERATION - LLM INPUT ===');
    logger.info('Contact Info:', {
      name: relevantContext.name,
      email: relevantContext.email,
      phone: relevantContext.phone,
      linkedin: relevantContext.linkedin,
    });
    logger.info('Job Summary:', jobSummary);
    logger.info('Extracted JD Keywords:', jobKeywords);
    logger.info({ job_description_length: job.description.length });
    logger.info({ tone });
    logger.info({ recent_experience_count: relevantContext.recent_experience.length });
    logger.info({ top_skills_count: relevantContext.top_skills.length });
    logger.info({ education_count: relevantContext.education.length });
    logger.info({ notable_projects_count: relevantContext.notable_projects.length });
    logger.info('===========================================');
    
    // Build enhanced user message with explicit keyword guidance
    const keywordGuidance = `
IMPORTANT - KEYWORD OPTIMIZATION FOR COVER LETTER:
Incorporate these keywords naturally to demonstrate alignment with the role:

Technical Keywords: ${jobKeywords.technical_keywords.join(', ') || 'None extracted'}
Skills & Competencies: ${jobKeywords.skill_keywords.join(', ') || 'None extracted'}
Role Level: ${jobKeywords.role_keywords.join(', ') || 'None extracted'}

Use these keywords naturally when describing:
- Your relevant experience and technical background
- Projects or achievements that align with the role
- Your enthusiasm for the company's technology stack
- Why you're a strong fit for this specific position
`;
    
    const userMessage = `${keywordGuidance}

Generate a ${tone} cover letter for the following job:

Job:
${JSON.stringify(jobSummary, null, 2)}

Candidate Context:
${JSON.stringify(relevantContext, null, 2)}

Tone: ${tone}`;
    
    // Log the full user message (truncated for readability)
    logger.info({ llm_message_preview: userMessage.slice(0, 500) + '...' });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500, // Cover letters should be concise: 300-400 words (1 page)
    });
    
    const content = completion.choices[0].message.content || '';
    
    // Highlight matched keywords for ATS optimization visibility
    const contentWithHighlights = highlightMatchedKeywords(content, jobKeywords);
    
    // Extract key points mentioned in the cover letter
    const keyPoints = extractKeyPoints(contentWithHighlights);
    
    const result: GeneratedCoverLetter = {
      content: contentWithHighlights,
      word_count: contentWithHighlights.split(/\s+/).length,
      tone,
      key_points: keyPoints,
    };
    
    logger.info(`Cover letter generated successfully (${result.word_count} words, ${tone} tone, keywords highlighted)`);
    return result;
  } catch (error) {
    logger.error('Failed to generate cover letter:', error);
    throw new Error(`Cover letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractKeyPoints(content: string): string[] {
  const keyPoints: string[] = [];
  
  // Look for bullet points or numbered lists
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match bullet points or numbered items
    const match = trimmed.match(/^(?:[-*•]|\d+\.)\s*(.+)$/);
    if (match) {
      keyPoints.push(match[1]);
    }
  }
  
  // If no bullet points found, extract sentences with strong verbs or achievements
  if (keyPoints.length === 0) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
      if (
        sentence.match(/\b(led|developed|created|managed|improved|increased|achieved|delivered)\b/i) ||
        sentence.match(/\b(experience|expertise|proficiency|background)\b/i)
      ) {
        keyPoints.push(sentence.trim());
      }
    }
  }
  
  return keyPoints.slice(0, 5); // Return top 5 key points
}
