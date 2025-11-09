import 'dotenv/config';
import { startServer } from './server.js';
startServer().catch((error) => {
    console.error('Failed to start API server', error);
    process.exit(1);
});
