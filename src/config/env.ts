import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_SES_REGION?: string;
  AWS_SES_FROM_EMAIL?: string;
  OPENAI_API_KEY?: string;
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  CORS_ORIGIN: string;
  CLIENT_URL?: string;
  BASE_URL?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

const validateEnv = (): EnvironmentConfig => {
  const requiredVars = ['MONGO_URI', 'JWT_SECRET'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '8000', 10),
    MONGO_URI: process.env.MONGO_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_SES_REGION: process.env.AWS_SES_REGION,
    AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TERMII_API_KEY: process.env.TERMII_API_KEY,
    TERMII_SENDER_ID: process.env.TERMII_SENDER_ID,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    BASE_URL: process.env.BASE_URL || 'http://localhost:8000',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  };
};

export const env = validateEnv();
