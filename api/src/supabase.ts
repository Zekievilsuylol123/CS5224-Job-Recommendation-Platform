import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logger } from './logger.js';

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_SECRET_KEY) {
  throw new Error('SUPABASE_SECRET_KEY environment variable is required (use the service_role secret key from Supabase settings)');
}

// Service role client for backend operations (bypasses RLS)
// Uses the secret service_role key which has admin privileges
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

logger.info('Supabase admin client initialized');

/**
 * Verify JWT token from frontend and return authenticated user
 */
export async function verifyUser(token: string) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      logger.warn({ error: error.message }, 'Failed to verify user token');
      throw new Error('Invalid or expired token');
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    logger.error({ err: error }, 'Error verifying user');
    throw error;
  }
}
