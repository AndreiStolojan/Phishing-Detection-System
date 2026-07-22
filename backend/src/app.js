import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import mailAccountRouter from './routes/mail-account.routes.js';
import emailRouter from './routes/email.routes.js';
import metaRouter from './routes/meta.routes.js';
import scanRouter from './routes/scan.routes.js';
import actionRouter from './routes/action.routes.js';
import reportRouter from './routes/report.routes.js';
import contactRouter from './routes/contact.routes.js';
import senderListRouter from './routes/sender-list.routes.js';
import sendErrorResponse from './common/http/send-error-response.js';
import errorMiddleware from './middlewares/error.middleware.js';
import arcjetMiddleware from '../extras/security/arcjet.middleware.js';
import { ARCJET_KEY, FRONTEND_APP_URL } from './config/env.js';

const app = express();

// In production Express is reached through the internal nginx container.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({ origin: FRONTEND_APP_URL, credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/ready',
  handler: (req, res) =>
    sendErrorResponse(res, 429, 'Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
});

app.use('/api/v1', apiRateLimiter);

const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
};

const readinessCheck = async (req, res) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return res.status(503).json({
      success: false,
      data: { status: 'not_ready' },
    });
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.status(200).json({
      success: true,
      data: { status: 'ready' },
    });
  } catch {
    return res.status(503).json({
      success: false,
      data: { status: 'not_ready' },
    });
  }
};

const authGuards = ARCJET_KEY ? [arcjetMiddleware] : [];
app.use('/api/v1/auth', ...authGuards, authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/mail-accounts', mailAccountRouter);
app.use('/api/v1/emails', emailRouter);
app.use('/api/v1/meta', metaRouter);
app.use('/api/v1/scans', scanRouter);
app.use('/api/v1/actions', actionRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/sender-lists', senderListRouter);

app.get('/api/v1/health', healthCheck);
app.get('/api/v1/ready', readinessCheck);

app.use((req, res) => {
  return sendErrorResponse(
    res,
    404,
    'Route not found',
    'ROUTE_NOT_FOUND',
    [`No route matches ${req.method} ${req.originalUrl}`]
  );
});

app.use(errorMiddleware);

export default app;
