//import winston from 'winston';
//import { env } from '../config/env.js';
//import path from 'path';
//import fs from 'fs';
//
///**
// * Winston Logger Configuration
// * Provides structured logging with different levels and transports
// */
//
//// Ensure logs directory exists
//const logsDir = path.join(process.cwd(), 'logs');
//if (!fs.existsSync(logsDir)) {
//  fs.mkdirSync(logsDir, { recursive: true });
//}
//
//// Define log format
//const logFormat = winston.format.combine(
//  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//  winston.format.errors({ stack: true }),
//  winston.format.splat(),
//  winston.format.json()
//);
//
//// Console format for development
//const consoleFormat = winston.format.combine(
//  winston.format.colorize(),
//  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//  winston.format.printf(({ timestamp, level, message, ...meta }) => {
//    let msg = `${timestamp} [${level}]: ${message}`;
//    if (Object.keys(meta).length > 0) {
//      msg += ` ${JSON.stringify(meta)}`;
//    }
//    return msg;
//  })
//);
//
//// Create logger instance
//export const logger = winston.createLogger({
//  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
//  format: logFormat,
//  defaultMeta: { service: 'ufarmx-api' },
//  transports: [
//    // Write all logs to combined.log
//    new winston.transports.File({
//      filename: path.join(logsDir, 'combined.log'),
//      maxsize: 5242880, // 5MB
//      maxFiles: 5,
//    }),
//    // Write errors to error.log
//    new winston.transports.File({
//      filename: path.join(logsDir, 'error.log'),
//      level: 'error',
//      maxsize: 5242880, // 5MB
//      maxFiles: 5,
//    }),
//  ],
//  // Handle exceptions and rejections
//  exceptionHandlers: [
//    new winston.transports.File({
//      filename: path.join(logsDir, 'exceptions.log'),
//    }),
//  ],
//  rejectionHandlers: [
//    new winston.transports.File({
//      filename: path.join(logsDir, 'rejections.log'),
//    }),
//  ],
//});
//
//// Add console transport for development
//if (env.NODE_ENV !== 'production') {
//  logger.add(
//    new winston.transports.Console({
//      format: consoleFormat,
//    })
//  );
//}
//
//// Export convenience methods
//export const log = {
//  error: (message: string, meta?: any) => logger.error(message, meta),
//  warn: (message: string, meta?: any) => logger.warn(message, meta),
//  info: (message: string, meta?: any) => logger.info(message, meta),
//  debug: (message: string, meta?: any) => logger.debug(message, meta),
//  verbose: (message: string, meta?: any) => logger.verbose(message, meta),
//};


//----------------- OLD CODE ABOVE--------------------------------------//


import winston from 'winston';
import { env } from '../config/env.js';
import path from 'path';
import fs from 'fs';

/**
 * Winston Logger Configuration
 * Vercel-safe logging setup
 */

const isProduction = env.NODE_ENV === 'production';

/**
 * Define log formats
 */

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({
    stack: true,
  }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;

      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }

      return msg;
    }
  )
);

/**
 * Create transports array
 */

const transports: winston.transport[] = [];

/**
 * LOCAL DEVELOPMENT:
 * Use file logging
 */

if (!isProduction) {
  const logsDir = path.join(
    process.cwd(),
    'logs'
  );

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, {
      recursive: true,
    });
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(
        logsDir,
        'combined.log'
      ),
      maxsize: 5242880,
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: path.join(
        logsDir,
        'error.log'
      ),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

/**
 * ALWAYS use console logging
 * Vercel captures stdout/stderr automatically
 */

transports.push(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

/**
 * Create logger
 */

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'ufarmx-api',
  },
  transports,

  /**
   * Exception handling
   */

  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

/**
 * Convenience methods
 */

export const log = {
  error: (message: string, meta?: any) =>
    logger.error(message, meta),

  warn: (message: string, meta?: any) =>
    logger.warn(message, meta),

  info: (message: string, meta?: any) =>
    logger.info(message, meta),

  debug: (message: string, meta?: any) =>
    logger.debug(message, meta),

  verbose: (message: string, meta?: any) =>
    logger.verbose(message, meta),
};