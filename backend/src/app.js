import express from 'express';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import mailAccountRouter from './routes/mail-account.routes.js';
import emailRouter from './routes/email.routes.js';
import metaRouter from './routes/meta.routes.js';
import scanRouter from './routes/scan.routes.js';
import actionRouter from './routes/action.routes.js';
import reportRouter from './routes/report.routes.js';
import contactRouter from './routes/contact.routes.js';
import sendErrorResponse from './common/http/send-error-response.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/mail-accounts', mailAccountRouter);
app.use('/api/v1/emails', emailRouter);
app.use('/api/v1/meta', metaRouter);
app.use('/api/v1/scans', scanRouter);
app.use('/api/v1/actions', actionRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/contact', contactRouter);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

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
