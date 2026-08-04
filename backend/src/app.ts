import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initConfig } from './config';

// Validate all required environment variables before the server starts.
// Exits with a non-zero code and a clear error if anything is missing.
const config = initConfig();

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    // Allow the frontend origin to send cookies
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Import routes
import authRouter from './routes/auth';
import receiptsRouter from './routes/receipts';
import paymentLinksRouter from './routes/payment-links';
import merchantRouter from './routes/merchant';

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/payment-links', paymentLinksRouter);
app.use('/api/merchant', merchantRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
    },
  });
});

const PORT = config.port;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Receipta backend listening on port ${PORT}`);
  });
}

export default app;
