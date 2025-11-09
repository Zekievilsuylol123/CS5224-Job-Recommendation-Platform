// Knowledge Base API Routes
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../logger.js';
import { createKnowledgeSource, getKnowledgeSources, deleteKnowledgeSource, createPendingKnowledgeSource, markSourceAsProcessing, markSourceAsCompleted, markSourceAsFailed, } from '../knowledge/sources.js';
import { scrapeAndParseLinkedIn } from '../knowledge/linkedin.js';
import { scrapeAndParseGitHub, extractGitHubUsername } from '../knowledge/github.js';
import { scrapeAndParseWebsite } from '../knowledge/website.js';
import { extract_resume_info } from '../resume/llm_analyzer.js';
import { aggregateKnowledgeBase, saveAggregatedKnowledgeBase } from '../knowledge/aggregator.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
// ============================================================================
// SCHEMAS
// ============================================================================
const linkedInSchema = z.object({
    url: z.string().url(),
});
const githubSchema = z.object({
    url: z.string(), // Can be URL or username
});
const websiteSchema = z.object({
    url: z.string().url(),
});
const manualTextSchema = z.object({
    content: z.string().min(1),
});
// ============================================================================
// GET /api/knowledge-sources
// List all knowledge sources for the authenticated user
// ============================================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const sources = await getKnowledgeSources(userId);
        res.json({ sources });
    }
    catch (error) {
        logger.error('Failed to fetch knowledge sources:', error);
        res.status(500).json({
            error: 'Failed to fetch knowledge sources',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ============================================================================
// POST /api/knowledge-sources/upload
// Upload and parse a document (PDF, DOCX)
// ============================================================================
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger.info(`Processing uploaded file: ${file.originalname}`);
        // Parse resume using LLM
        const parsedProfile = await extract_resume_info(file);
        // Create knowledge source
        const source = await createKnowledgeSource(userId, 'resume', parsedProfile, {
            sourceIdentifier: file.originalname,
            metadata: {
                file_size: file.size,
                mime_type: file.mimetype,
                original_name: file.originalname,
            },
        });
        // Aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        res.json({
            source,
            message: 'File uploaded and parsed successfully',
        });
    }
    catch (error) {
        logger.error('Failed to upload file:', error);
        res.status(500).json({
            error: 'Failed to process file',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ============================================================================
// POST /api/knowledge-sources/linkedin
// Add LinkedIn profile
// ============================================================================
router.post('/linkedin', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const body = linkedInSchema.parse(req.body);
        logger.info(`Processing LinkedIn profile: ${body.url}`);
        // Create pending source
        const pendingSource = await createPendingKnowledgeSource(userId, 'linkedin', body.url);
        // Process async (in background)
        processLinkedInProfile(pendingSource.id, userId, body.url).catch((error) => {
            logger.error(`Background LinkedIn processing failed for source ${pendingSource.id}:`, error);
        });
        res.json({
            source: pendingSource,
            message: 'LinkedIn profile is being processed',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to add LinkedIn profile:', error);
        res.status(500).json({
            error: 'Failed to add LinkedIn profile',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
async function processLinkedInProfile(sourceId, userId, url) {
    try {
        await markSourceAsProcessing(sourceId);
        const { raw, parsed } = await scrapeAndParseLinkedIn(url);
        await markSourceAsCompleted(sourceId, parsed, raw);
        // Aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        logger.info(`Successfully processed LinkedIn profile for source ${sourceId}`);
    }
    catch (error) {
        await markSourceAsFailed(sourceId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}
// ============================================================================
// POST /api/knowledge-sources/github
// Add GitHub profile
// ============================================================================
router.post('/github', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const body = githubSchema.parse(req.body);
        const username = extractGitHubUsername(body.url);
        logger.info(`Processing GitHub profile: ${username}`);
        // Create pending source
        const pendingSource = await createPendingKnowledgeSource(userId, 'github', username);
        // Process async (in background)
        processGitHubProfile(pendingSource.id, userId, username).catch((error) => {
            logger.error(`Background GitHub processing failed for source ${pendingSource.id}:`, error);
        });
        res.json({
            source: pendingSource,
            message: 'GitHub profile is being processed',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to add GitHub profile:', error);
        res.status(500).json({
            error: 'Failed to add GitHub profile',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
async function processGitHubProfile(sourceId, userId, username) {
    try {
        await markSourceAsProcessing(sourceId);
        const { raw, parsed } = await scrapeAndParseGitHub(username);
        await markSourceAsCompleted(sourceId, parsed, raw);
        // Aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        logger.info(`Successfully processed GitHub profile for source ${sourceId}`);
    }
    catch (error) {
        await markSourceAsFailed(sourceId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}
// ============================================================================
// POST /api/knowledge-sources/website
// Add personal website
// ============================================================================
router.post('/website', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const body = websiteSchema.parse(req.body);
        logger.info(`Processing website: ${body.url}`);
        // Create pending source
        const pendingSource = await createPendingKnowledgeSource(userId, 'personal_website', body.url);
        // Process async (in background)
        processWebsite(pendingSource.id, userId, body.url).catch((error) => {
            logger.error(`Background website processing failed for source ${pendingSource.id}:`, error);
        });
        res.json({
            source: pendingSource,
            message: 'Website is being processed',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to add website:', error);
        res.status(500).json({
            error: 'Failed to add website',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
async function processWebsite(sourceId, userId, url) {
    try {
        await markSourceAsProcessing(sourceId);
        const { raw, parsed } = await scrapeAndParseWebsite(url);
        await markSourceAsCompleted(sourceId, parsed, raw);
        // Aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        logger.info(`Successfully processed website for source ${sourceId}`);
    }
    catch (error) {
        await markSourceAsFailed(sourceId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}
// ============================================================================
// POST /api/knowledge-sources/text
// Add manual text context
// ============================================================================
router.post('/text', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const body = manualTextSchema.parse(req.body);
        logger.info('Processing manual text context');
        // Store as-is with minimal parsing
        const parsedData = {
            about: body.content,
            summary: body.content.slice(0, 500),
        };
        const source = await createKnowledgeSource(userId, 'manual_text', parsedData, {
            sourceIdentifier: 'Manual Context',
            metadata: {
                length: body.content.length,
            },
        });
        // Aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        res.json({
            source,
            message: 'Manual context added successfully',
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        logger.error('Failed to add manual text:', error);
        res.status(500).json({
            error: 'Failed to add manual text',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// ============================================================================
// DELETE /api/knowledge-sources/:id
// Delete a knowledge source
// ============================================================================
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await deleteKnowledgeSource(id, userId);
        // Re-aggregate knowledge base
        const knowledgeBase = await aggregateKnowledgeBase(userId);
        await saveAggregatedKnowledgeBase(userId, knowledgeBase);
        res.json({ message: 'Knowledge source deleted successfully' });
    }
    catch (error) {
        logger.error('Failed to delete knowledge source:', error);
        res.status(500).json({
            error: 'Failed to delete knowledge source',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
export default router;
