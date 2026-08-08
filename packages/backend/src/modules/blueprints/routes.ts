import { Router } from 'express';
import { z } from 'zod';
import { BLUEPRINT_LANES, type BlueprintContent } from 'shared';
import { prisma } from '../../db/prisma.js';
import { mapArtefact } from '../../db/mappers.js';

/**
 * Fase 4 — Blueprints e mapas de serviço.
 *
 * Nesta v1 o artefacto é um service blueprint com as swimlanes tradicionais
 * (fases × camadas). O `content` é estruturado para, mais tarde, se tornar
 * interativo/navegável (fluxo de topo → deep-dives em jornadas/artefactos).
 */
export const blueprintsRouter = Router();

/** Conteúdo inicial: camadas tradicionais e uma primeira etapa vazia. */
function defaultContent(): BlueprintContent {
  const stages = ['Etapa 1'];
  return {
    stages,
    lanes: BLUEPRINT_LANES.map((l) => ({
      key: l.key,
      label: l.label,
      cells: stages.map(() => ''),
    })),
  };
}

// Criar artefacto
const createSchema = z.object({
  type: z.enum(['service_blueprint', 'service_map']).default('service_blueprint'),
  title: z.string().min(1, 'Título obrigatório'),
});

blueprintsRouter.post('/:projectId/artefacts', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const a = await prisma.artefact.create({
    data: {
      projectId: req.params.projectId,
      type: parsed.data.type,
      title: parsed.data.title,
      version: 1,
      content: JSON.stringify(defaultContent()),
      origin: 'manual',
      status: 'draft',
    },
  });
  res.status(201).json(mapArtefact(a));
});

// Atualizar título / conteúdo (edição do blueprint)
const contentSchema = z.object({
  stages: z.array(z.string()),
  lanes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      cells: z.array(z.string()),
    }),
  ),
});
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: contentSchema.optional(),
});

blueprintsRouter.patch('/:projectId/artefacts/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;
  const a = await prisma.artefact.update({
    where: { id: req.params.id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.content !== undefined ? { content: JSON.stringify(d.content) } : {}),
    },
  });
  res.json(mapArtefact(a));
});

// Validar (aprovação humana)
blueprintsRouter.patch('/:projectId/artefacts/:id/validate', async (req, res) => {
  const a = await prisma.artefact.update({
    where: { id: req.params.id },
    data: { status: 'validated', validatedAt: new Date() },
  });
  res.json(mapArtefact(a));
});

// Eliminar
blueprintsRouter.delete('/:projectId/artefacts/:id', async (req, res) => {
  await prisma.artefact.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
