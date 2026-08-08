import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { loadFull } from '../../core/projects.routes.js';

/**
 * Fase 1 — Definição do projeto: cliente, objetivos e outcomes esperados.
 * Tudo aqui é entrada manual do utilizador (a IA não intervém nesta fase).
 */
export const definitionRouter = Router();

const schema = z.object({
  client: z.object({
    name: z.string().min(1, 'Nome do cliente obrigatório'),
    contact: z.string().optional(),
    notes: z.string().optional(),
  }),
  objectives: z.array(z.string()).default([]),
  expectedOutcomes: z.array(z.string()).default([]),
});

// GET faz-se via /projects/:id (projeto completo). Aqui só há update.
definitionRouter.put('/:projectId/definition', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { client, objectives, expectedOutcomes } = parsed.data;

  await prisma.project.update({
    where: { id: req.params.projectId },
    data: {
      clientName: client.name,
      clientContact: client.contact ?? null,
      clientNotes: client.notes ?? null,
      objectives: JSON.stringify(objectives),
      expectedOutcomes: JSON.stringify(expectedOutcomes),
    },
  });

  res.json(await loadFull(req.params.projectId));
});
