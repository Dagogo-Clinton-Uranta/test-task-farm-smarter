import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';


const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.PORT);

   
  } catch (error: any) {
   console.error('Failed to start server--->', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', {
    error: error.message,
    name: error.name,
    stack: error.stack,
  });
  process.exit(1);
});

startServer();
