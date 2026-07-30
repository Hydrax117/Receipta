import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT ?? 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Receipta backend listening on port ${PORT}`);
  });
}

export default app;
