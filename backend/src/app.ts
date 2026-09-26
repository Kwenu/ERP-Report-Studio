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
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const API_BASE = '/api/v1';
app.use(`${API_BASE}/auth`, authRouter);
app.use(`${API_BASE}/datasources`, datasourcesRouter);
app.use(`${API_BASE}/schema`, schemaRouter);
app.use(`${API_BASE}/reports`, reportsRouter);
app.use(`${API_BASE}/users`, usersRouter);
app.use(`${API_BASE}/audit`, auditRouter);
app.use(`${API_BASE}/schedules`, schedulesRouter);

app.use(notFoundHandler);
app.use(errorHandler);
