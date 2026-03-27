import express from 'express';
import { prisma } from '@rolodex/db';
import itemRoutes from './routes/itemRoutes';
import rolodexRoutes from './routes/rolodex';
import integrationsRoutes from './routes/integrations';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const allowedOrigins = (
  process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://127.0.0.1:5173', 'null']
).map((origin) => origin.trim());

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (requestOrigin === 'null' && allowedOrigins.includes('null')) {
    res.header('Access-Control-Allow-Origin', 'null');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        ok: true,
        database: 'reachable',
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/items', itemRoutes);
app.use('/api/rolodex', rolodexRoutes);
app.use('/api/integrations', integrationsRoutes);

app.use(errorHandler);

export default app;
