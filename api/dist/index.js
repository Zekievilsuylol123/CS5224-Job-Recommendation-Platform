import 'dotenv/config';
import { startServer } from './server.js';
import 'dotenv/config';
startServer().catch((error) => {
    console.error('Failed to start API server', error);
    process.exit(1);
});
