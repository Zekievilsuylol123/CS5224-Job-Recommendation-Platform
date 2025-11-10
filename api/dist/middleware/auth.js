import { verifyUser } from '../supabase.js';
import { logger } from '../logger.js';
/**
 * Middleware to require authentication for protected routes
 * Verifies JWT token from Authorization header and attaches user to request
 */
export async function requireAuth(req, res, next) {
    if (process.env.DISABLE_AUTH === 'true') {
        req.user = { id: 'dev', email: 'dev@local' };
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'unauthorized',
            message: 'Missing or invalid authorization header'
        });
        return;
    }
    try {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const user = await verifyUser(token);
        // Attach user to request object for downstream handlers
        req.user = {
            id: user.id,
            email: user.email
        };
        logger.debug({ userId: user.id }, 'User authenticated');
        next();
    }
    catch (error) {
        logger.warn({ err: error }, 'Authentication failed');
        res.status(401).json({
            error: 'unauthorized',
            message: 'Invalid or expired token'
        });
    }
}
/**
 * Optional auth middleware - sets user if token is present but doesn't require it
 */
export async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        next();
        return;
    }
    try {
        const token = authHeader.substring(7);
        const user = await verifyUser(token);
        req.user = {
            id: user.id,
            email: user.email
        };
        logger.debug({ userId: user.id }, 'Optional auth: user authenticated');
    }
    catch (error) {
        logger.debug('Optional auth: no valid token, continuing without user');
    }
    next();
}
