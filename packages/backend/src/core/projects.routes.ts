import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { mapProject, mapProjectSummary } from '../db/mappers.js';

/**
 * Rotas do objeto central `Project`. As restantes fases operam sobre projetos
 * criados aqui.
 */
export const projectsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  clientName: z.string().optional(),
});

// Listar (resumos leves)
projectsRouter.get('/', async (_req, res) => {
  const rows = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { researchItems: true } } },
  });
  res.json(rows.map(mapProjectSummary));
});

// Criar
projectsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      clientName: parsed.data.clientName ?? '',
    },
  });
  const full = await loadFull(project.id);
  res.status(201).json(full);
});

// Obter projeto completo
projectsRouter.get('/:id', async (req, res) => {
  const full = await loadFull(req.params.id);
  if (!full) return res.status(404).json({ error: 'Projeto não encontrado' });
  res.json(full);
});

// Atualizar fase atual (navegação do fluxo)
projectsRouter.patch('/:id/phase', async (req, res) => {
  const schema = z.object({ currentPhase: z.number().int().min(1).max(4) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  await prisma.project.update({
    where: { id: req.params.id },
    data: { currentPhase: parsed.data.currentPhase },
  });
  res.json(await loadFull(req.params.id));
});

// Eliminar
projectsRouter.delete('/:id', async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

/** Carrega um projeto com todas as coleções e devolve no formato de domínio. */
export async function loadFull(id: string) {
  const row = await prisma.project.findUnique({
    where: { id },
    include: {
      researchItems: { orderBy: { createdAt: 'asc' } },
      themes: { orderBy: { createdAt: 'asc' } },
      insights: { orderBy: { createdAt: 'asc' } },
      gaps: { orderBy: { createdAt: 'asc' } },
      artefacts: { orderBy: { createdAt: 'asc' } },
    },
  });
  return row ? mapProject(row) : null;
}
