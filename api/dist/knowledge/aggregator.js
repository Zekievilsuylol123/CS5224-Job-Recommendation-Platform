// Knowledge Base Aggregator
// Combines all knowledge sources into a unified knowledge base
import { supabaseAdmin } from '../supabase.js';
import { logger } from '../logger.js';
import { getKnowledgeSources } from './sources.js';
export async function aggregateKnowledgeBase(userId) {
    logger.info(`Aggregating knowledge base for user ${userId}`);
    const sources = await getKnowledgeSources(userId);
    const completedSources = sources.filter((s) => s.processing_status === 'completed');
    if (completedSources.length === 0) {
        logger.warn(`No completed knowledge sources for user ${userId}`);
        return createEmptyKnowledgeBase();
    }
    // Start with empty structure
    const aggregated = {
        skills: [],
        technical_skills: [],
        soft_skills: [],
        languages: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        interests: [],
        publications: [],
        awards: [],
        personal_website_urls: [],
        sources: [],
    };
    // Aggregate data from all sources
    for (const source of completedSources) {
        const data = source.parsed_data;
        // Take first non-empty value for singular fields
        aggregated.name = aggregated.name || data.name;
        aggregated.email = aggregated.email || data.email;
        aggregated.phone = aggregated.phone || data.phone;
        aggregated.location = aggregated.location || data.location;
        aggregated.summary = aggregated.summary || data.summary;
        aggregated.about = aggregated.about || data.about;
        aggregated.linkedin_profile_url = aggregated.linkedin_profile_url || data.linkedin_profile_url;
        aggregated.github_username = aggregated.github_username || data.github_username;
        // Combine arrays with deduplication
        if (data.skills) {
            aggregated.skills.push(...data.skills);
        }
        if (data.technical_skills) {
            aggregated.technical_skills.push(...data.technical_skills);
        }
        if (data.soft_skills) {
            aggregated.soft_skills.push(...data.soft_skills);
        }
        if (data.interests) {
            aggregated.interests.push(...data.interests);
        }
        if (data.publications) {
            aggregated.publications.push(...data.publications);
        }
        if (data.awards) {
            aggregated.awards.push(...data.awards);
        }
        if (data.personal_website_url) {
            aggregated.personal_website_urls.push(data.personal_website_url);
        }
        // Add experiences with source annotation
        if (data.experience) {
            aggregated.experience.push(...data.experience.map((exp) => ({
                ...exp,
                source: source.source_type,
            })));
        }
        // Add education with source annotation
        if (data.education) {
            aggregated.education.push(...data.education.map((edu) => ({
                ...edu,
                source: source.source_type,
            })));
        }
        // Add certifications with source annotation
        if (data.certifications) {
            aggregated.certifications.push(...data.certifications.map((cert) => ({
                ...cert,
                source: source.source_type,
            })));
        }
        // Add projects with source annotation
        if (data.projects) {
            aggregated.projects.push(...data.projects.map((proj) => ({
                ...proj,
                source: source.source_type,
            })));
        }
        // Add languages
        if (data.languages) {
            aggregated.languages.push(...data.languages);
        }
        // Track sources
        aggregated.sources.push({
            type: source.source_type,
            identifier: source.source_identifier,
            created_at: source.created_at,
        });
    }
    // Deduplicate arrays
    aggregated.skills = [...new Set(aggregated.skills)];
    aggregated.technical_skills = [...new Set(aggregated.technical_skills)];
    aggregated.soft_skills = [...new Set(aggregated.soft_skills)];
    aggregated.interests = [...new Set(aggregated.interests)];
    aggregated.publications = [...new Set(aggregated.publications)];
    aggregated.awards = [...new Set(aggregated.awards)];
    // Deduplicate languages by language name (keep highest proficiency)
    const languageMap = new Map();
    aggregated.languages.forEach((lang) => {
        if (!languageMap.has(lang.language)) {
            languageMap.set(lang.language, lang.proficiency);
        }
    });
    aggregated.languages = Array.from(languageMap.entries()).map(([language, proficiency]) => ({
        language,
        proficiency,
    }));
    // Sort experiences by date (most recent first)
    aggregated.experience.sort((a, b) => {
        if (a.is_current)
            return -1;
        if (b.is_current)
            return 1;
        const aYear = a.end_date?.year || a.start_date?.year || 0;
        const bYear = b.end_date?.year || b.start_date?.year || 0;
        return bYear - aYear;
    });
    logger.info(`Aggregated knowledge base: ${aggregated.skills.length} skills, ${aggregated.experience.length} experiences`);
    return aggregated;
}
function createEmptyKnowledgeBase() {
    return {
        skills: [],
        technical_skills: [],
        soft_skills: [],
        languages: [],
        experience: [],
        education: [],
        certifications: [],
        projects: [],
        interests: [],
        publications: [],
        awards: [],
        personal_website_urls: [],
        sources: [],
    };
}
// Save aggregated knowledge base to profile
export async function saveAggregatedKnowledgeBase(userId, knowledgeBase) {
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({
        knowledge_base_summary: knowledgeBase,
        knowledge_base_updated_at: new Date().toISOString(),
    })
        .eq('id', userId);
    if (error) {
        logger.error('Failed to save aggregated knowledge base:', error);
        throw new Error(`Failed to save knowledge base: ${error.message}`);
    }
    logger.info(`Saved aggregated knowledge base for user ${userId}`);
}
// Get aggregated knowledge base from profile
export async function getAggregatedKnowledgeBase(userId) {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('knowledge_base_summary, knowledge_base_updated_at')
        .eq('id', userId)
        .single();
    if (error) {
        logger.error('Failed to get aggregated knowledge base:', error);
        return null;
    }
    return data?.knowledge_base_summary;
}
