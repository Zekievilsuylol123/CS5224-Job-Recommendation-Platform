// Generated Materials API Routes
// Handles resume and cover letter generation for specific jobs
import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { supabaseAdmin } from '../supabase.js';
import { aggregateKnowledgeBase } from '../knowledge/aggregator.js';
import { generateResume } from '../ai/resume_generator.js';
import { generateCoverLetter } from '../ai/cover_letter_generator.js';
import { fetchExternalJobs } from '../jobs/external.js';
import { fetchJobDescription } from '../jobs/jdFetcher.js';
const router = express.Router();
// ============================================================================
// SCHEMAS
// ============================================================================
const generateResumeSchema = z.object({
    tone: z.enum(['formal', 'professional', 'enthusiastic']).optional(),
});
const generateCoverLetterSchema = z.object({
    tone: z.enum(['formal', 'professional', 'enthusiastic']).optional(),
});
// ============================================================================
// Helper: Fetch job details from database or external API
// ============================================================================
async function getJobDetails(jobId) {
    // First try to find in local database
    const { data: localJob, error } = await supabaseAdmin
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
    if (localJob && !error) {
        return {
            title: localJob.title,
            company: localJob.company,
            location: localJob.location,
            description: localJob.description,
            requirements: localJob.requirements,
            preferred_qualifications: localJob.preferred_qualifications,
        };
    }
    // If not found locally, check external jobs
    const externalJobs = await fetchExternalJobs();
    const externalJob = externalJobs.find(j => j.id === jobId);
    if (!externalJob) {
        return null;
    }
    // Fetch full job description
    const jdData = await fetchJobDescription(externalJob.url, externalJob.company);
    return {
        title: jdData?.title || externalJob.title,
        company: externalJob.company,
        location: jdData?.location || externalJob.location,
        description: jdData?.jdText || `Join ${externalJob.company} as a ${externalJob.title}.`,
        requirements: externalJob.tags || [],
        preferred_qualifications: [],
    };
}
// ============================================================================
// POST /api/generate/resume/:jobId
// Generate a tailored resume for a specific job
// ============================================================================
router.post('/resume/:jobId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        logger.info(`Generating resume for user ${userId}, job ${jobId}`);
        // Validate request body
        const body = generateResumeSchema.parse(req.body);
        // Get job details
        const job = await getJobDetails(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Get user's knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        if (!knowledgeBase.summary && (!knowledgeBase.skills || knowledgeBase.skills.length === 0)) {
            return res.status(400).json({
                error: 'Insufficient knowledge base',
                message: 'Please add at least one knowledge source before generating materials',
            });
        }
        // Generate resume
        const generatedResume = await generateResume(knowledgeBase, job);
        // Save to database
        const { data: material, error } = await supabaseAdmin
            .from('generated_materials')
            .insert({
            user_id: userId,
            job_external_id: jobId, // Using job_external_id for external jobs
            material_type: 'resume',
            content: generatedResume.content,
            generation_metadata: {
                word_count: generatedResume.word_count,
                sections: generatedResume.sections,
                generated_at: new Date().toISOString(),
            },
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            material,
            message: 'Resume generated successfully',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to generate resume:', error);
        // Handle different error types
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'object' && error !== null) {
            errorMessage = JSON.stringify(error);
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        res.status(500).json({
            error: 'Failed to generate resume',
            message: errorMessage,
            ...(process.env.NODE_ENV !== 'production' && {
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name,
            }),
        });
    }
});
// ============================================================================
// POST /api/generate/cover-letter/:jobId
// Generate a personalized cover letter for a specific job
// ============================================================================
router.post('/cover-letter/:jobId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        logger.info(`Generating cover letter for user ${userId}, job ${jobId}`);
        // Validate request body
        const body = generateCoverLetterSchema.parse(req.body);
        const tone = body.tone || 'professional';
        // Get job details
        const job = await getJobDetails(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Get user's knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        if (!knowledgeBase.summary && (!knowledgeBase.skills || knowledgeBase.skills.length === 0)) {
            return res.status(400).json({
                error: 'Insufficient knowledge base',
                message: 'Please add at least one knowledge source before generating materials',
            });
        }
        // Generate cover letter
        const generatedCoverLetter = await generateCoverLetter(knowledgeBase, job, tone);
        // Save to database
        const { data: material, error } = await supabaseAdmin
            .from('generated_materials')
            .insert({
            user_id: userId,
            job_external_id: jobId, // Using job_external_id for external jobs
            material_type: 'cover_letter',
            content: generatedCoverLetter.content,
            generation_metadata: {
                word_count: generatedCoverLetter.word_count,
                tone: generatedCoverLetter.tone,
                key_points: generatedCoverLetter.key_points,
                generated_at: new Date().toISOString(),
            },
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json({
            material,
            message: 'Cover letter generated successfully',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to generate cover letter:', error);
        // Handle different error types
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'object' && error !== null) {
            errorMessage = JSON.stringify(error);
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        res.status(500).json({
            error: 'Failed to generate cover letter',
            message: errorMessage,
            ...(process.env.NODE_ENV !== 'production' && {
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name,
            }),
        });
    }
});
// ============================================================================
// GET /api/generate/:jobId/materials
// Get all generated materials for a specific job
// ============================================================================
router.get('/:jobId/materials', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        const { data: materials, error } = await supabaseAdmin
            .from('generated_materials')
            .select('*')
            .eq('user_id', userId)
            .eq('job_external_id', jobId) // Fixed: using job_external_id
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json({ materials });
    }
    catch (error) {
        logger.error('Failed to fetch generated materials:', error);
        res.status(500).json({
            error: 'Failed to fetch materials',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ============================================================================
// GET /api/generate/:id
// Get a specific generated material by ID
// ============================================================================
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { data: material, error } = await supabaseAdmin
            .from('generated_materials')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error)
            throw error;
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        res.json({ material });
    }
    catch (error) {
        logger.error('Failed to fetch generated material:', error);
        res.status(500).json({
            error: 'Failed to fetch material',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ============================================================================
// DELETE /api/generate/:id
// Delete a generated material
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('generated_materials')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error)
            throw error;
        res.json({ message: 'Material deleted successfully' });
    }
    catch (error) {
        logger.error('Failed to delete generated material:', error);
        res.status(500).json({
            error: 'Failed to delete material',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
