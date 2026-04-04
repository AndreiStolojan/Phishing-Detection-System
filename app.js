import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import mailAccountRouter from './routes/mail-account.routes.js';
import sendErrorResponse from './common/http/send-error-response.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/manual-tests', express.static(path.join(__dirname, 'manual-tests')));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/mail-accounts', mailAccountRouter);

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
