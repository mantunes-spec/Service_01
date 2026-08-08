import express from 'express';
import cors from 'cors';
import { ai } from './ai/index.js';
import { projectsRouter } from './core/projects.routes.js';
import { definitionRouter } from './modules/definition/routes.js';
import { researchRouter } from './modules/research/routes.js';
import { analysisRouter } from './modules/analysis/routes.js';
import { blueprintsRouter } from './modules/blueprints/routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiProvider: ai.name });
});

// Objeto central
app.use('/api/projects', projectsRouter);

// Módulos por fase (todos aninhados sob /api/projects/:projectId)
app.use('/api/projects', definitionRouter);
app.use('/api/projects', researchRouter);
app.use('/api/projects', analysisRouter);
app.use('/api/projects', blueprintsRouter);

// Tratamento de erros central
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    res.status(err.status ?? 500).json({ error: err.message ?? 'Erro interno' });
  },
);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[backend] a ouvir em http://localhost:${port} (IA: ${ai.name})`);
});
