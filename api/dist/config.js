import { z } from 'zod';
const configSchema = z.object({
    PORT: z.coerce.number().int().positive().default(8080),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    ALLOW_FILE_STORE: z
        .string()
        .optional()
        .transform((value) => value === 'true'),
    SEED_JOBS_COUNT: z.coerce.number().int().positive().default(30),
    UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(10).default(3)
});
const parsed = configSchema.parse(process.env);
export const config = {
    port: parsed.PORT,
    webOrigin: parsed.WEB_ORIGIN,
    allowFileStore: parsed.ALLOW_FILE_STORE ?? false,
    seedJobsCount: parsed.SEED_JOBS_COUNT,
    uploadMaxMb: parsed.UPLOAD_MAX_MB
};
