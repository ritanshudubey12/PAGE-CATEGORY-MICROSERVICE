import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  brrToken: process.env.BRR_TOKEN || 'triostack_secret_page_category_token_2026',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'triostack_page_category',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    timeoutMs: parseInt(process.env.DB_TIMEOUT_MS || '10000', 10),
  },
  bulk: {
    maxBulkRows: parseInt(process.env.MAX_BULK_ROWS || '5000', 10),
    maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10),
  },
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()),
  }
};
