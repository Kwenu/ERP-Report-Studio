import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { datasourcesRouter } from './routes/datasources.routes';
import { schemaRouter } from './routes/schema.routes';
import { reportsRouter } from './routes/reports.routes';
import { usersRouter } from './routes/users.routes';
import { auditRouter } from './routes/audit.routes';
import { schedulesRouter } from './routes/schedules.routes';
import { invoicesRouter } from './routes/invoices.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import path from 'path';

export const app = express();

app.use(helmet());

const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/;
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || env.corsOrigin.includes(origin) || (env.nodeEnv !== 'production' && DEV_ORIGIN.test(origin))) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} is not allowed. Add it to CORS_ORIGIN in backend/.env.`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

for (const base of ['/api/v1', '/v1']) {
  app.use(`${base}/auth`, authRouter);
  app.use(`${base}/datasources`, datasourcesRouter);
  app.use(`${base}/schema`, schemaRouter);
  app.use(`${base}/reports`, reportsRouter);
  app.use(`${base}/users`, usersRouter);
  app.use(`${base}/audit`, auditRouter);
  app.use(`${base}/schedules`, schedulesRouter);
  app.use(`${base}/invoices`, invoicesRouter);
}

const webDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(webDist));
app.get(/^\/(?!api\/|health).*/, (_req, res) =>
  res.sendFile(path.join(webDist, 'index.html'))
);

app.use(notFoundHandler);
app.use(errorHandler);
export default app;
