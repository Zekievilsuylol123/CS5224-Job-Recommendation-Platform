// Knowledge Sources CRUD operations
import { supabaseAdmin } from '../supabase.js';
import { logger } from '../logger.js';
export async function createKnowledgeSource(userId, sourceType, parsedData, options = {}) {
    // If creating a resume source, delete any existing resume sources first
    // (we only want the latest resume)
    if (sourceType === 'resume') {
        await deleteOldResumes(userId);
    }
    const { data, error } = await supabaseAdmin
        .from('knowledge_sources')
        .insert({
        user_id: userId,
        source_type: sourceType,
        source_identifier: options.sourceIdentifier,
        raw_content: options.rawContent,
        parsed_data: parsedData,
        metadata: options.metadata,
        processing_status: 'completed',
    })
        .select()
        .single();
    if (error) {
        logger.error('Failed to create knowledge source:', error);
        throw new Error(`Failed to create knowledge source: ${error.message}`);
    }
    logger.info(`Created knowledge source: ${sourceType} for user ${userId}`);
    return data;
}
async function deleteOldResumes(userId) {
    try {
        const { error } = await supabaseAdmin
            .from('knowledge_sources')
            .delete()
            .eq('user_id', userId)
            .eq('source_type', 'resume');
        if (error) {
            logger.warn('Failed to delete old resumes:', error);
        }
        else {
            logger.info(`Deleted old resume sources for user ${userId}`);
        }
    }
    catch (err) {
        logger.warn('Error deleting old resumes:', err);
    }
}
export async function getKnowledgeSources(userId) {
    const { data, error } = await supabaseAdmin
        .from('knowledge_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        logger.error('Failed to fetch knowledge sources:', error);
        throw new Error(`Failed to fetch knowledge sources: ${error.message}`);
    }
    return data || [];
}
export async function getKnowledgeSourceById(id, userId) {
    const { data, error } = await supabaseAdmin
        .from('knowledge_sources')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        logger.error('Failed to fetch knowledge source:', error);
        throw new Error(`Failed to fetch knowledge source: ${error.message}`);
    }
    return data;
}
export async function updateKnowledgeSource(id, userId, updates) {
    const { data, error } = await supabaseAdmin
        .from('knowledge_sources')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (error) {
        logger.error('Failed to update knowledge source:', error);
        throw new Error(`Failed to update knowledge source: ${error.message}`);
    }
    return data;
}
export async function deleteKnowledgeSource(id, userId) {
    const { error } = await supabaseAdmin
        .from('knowledge_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) {
        logger.error('Failed to delete knowledge source:', error);
        throw new Error(`Failed to delete knowledge source: ${error.message}`);
    }
    logger.info(`Deleted knowledge source: ${id}`);
}
// Create pending source that will be processed async
export async function createPendingKnowledgeSource(userId, sourceType, sourceIdentifier) {
    const { data, error } = await supabaseAdmin
        .from('knowledge_sources')
        .insert({
        user_id: userId,
        source_type: sourceType,
        source_identifier: sourceIdentifier,
        parsed_data: {}, // Empty until processed
        processing_status: 'pending',
    })
        .select()
        .single();
    if (error) {
        logger.error('Failed to create pending knowledge source:', error);
        throw new Error(`Failed to create pending knowledge source: ${error.message}`);
    }
    return data;
}
// Mark source as processing
export async function markSourceAsProcessing(id) {
    await supabaseAdmin
        .from('knowledge_sources')
        .update({ processing_status: 'processing' })
        .eq('id', id);
}
// Mark source as completed with data
export async function markSourceAsCompleted(id, parsedData, rawContent) {
    await supabaseAdmin
        .from('knowledge_sources')
        .update({
        processing_status: 'completed',
        parsed_data: parsedData,
        raw_content: rawContent,
    })
        .eq('id', id);
}
// Mark source as failed
export async function markSourceAsFailed(id, errorMessage) {
    await supabaseAdmin
        .from('knowledge_sources')
        .update({
        processing_status: 'failed',
        error_message: errorMessage,
    })
        .eq('id', id);
}
