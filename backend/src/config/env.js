import { config } from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';
const resolvedEnvFilePath = `.env.${nodeEnv}.local`;

config({ path: resolvedEnvFilePath });

const requiredEnvVars = ['PORT', 'DB_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'MAIL_TOKEN_ENCRYPTION_KEY'];
const requiredInProduction = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'EMAIL_FROM', 'EMAIL_PASSWORD'];

if (nodeEnv === 'production') {
    const missingProd = requiredInProduction.filter((v) => !process.env[v]);
    if (missingProd.length > 0) {
        throw new Error(
            `Missing required production env vars: ${missingProd.join(', ')}`
        );
    }
}
const missingEnvVars = requiredEnvVars.filter((envName) => !process.env[envName]);

if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required env vars in ${resolvedEnvFilePath}: ${missingEnvVars.join(', ')}`
    );
}

export const {
    PORT,
    NODE_ENV,
    DB_URI,
    JWT_EXPIRES_IN,
    JWT_SECRET,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    ARCJET_ENV,
    ARCJET_KEY,
    EMAIL_FROM,
    EMAIL_PASSWORD,
    ADMIN_NAME,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    MAIL_TOKEN_ENCRYPTION_KEY,
    AI_SEMANTIC_ENABLED,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT_MS,
    OLLAMA_PROMPT_VERSION,
    SYNC_INTERVAL_MINUTES,
} = process.env;

export const FRONTEND_APP_URL = process.env.FRONTEND_APP_URL || 'http://localhost:5173';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || EMAIL_FROM || '';
