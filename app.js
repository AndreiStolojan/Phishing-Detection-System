import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRouter from './routes/user.routes.js';
import authRouter from './routes/auth.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';
import cookieParser from 'cookie-parser';
import arcjetMiddleware from './middlewares/arcjet.middleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(arcjetMiddleware);
app.use('/manual-tests', express.static(path.join(__dirname, 'manual-tests')));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);


app.get('/', (req, res) => {
  res.status(200).send('Bine ai venit la test');
});

app.use(errorMiddleware);

export default app;
