import dotenv from 'dotenv';

dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
}

const validateEnv = (): EnvironmentConfig => {
  const requiredVars = ['DATABASE_URL'];

  for (const varName of requiredVars) {
    if (!process.env[varName] && process.env.NODE_ENV !== 'test') {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '8000', 10),
    // Replace this in your .env with your local PostgreSQL/PostGIS connection string.
    DATABASE_URL:
      process.env.DATABASE_URL ||
      'postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?schema=public',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  };
};

export const env = validateEnv();
