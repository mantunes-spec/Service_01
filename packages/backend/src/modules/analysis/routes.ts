import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { mapGap, mapInsight, mapTheme } from '../../db/mappers.js';
import { ai } from '../../ai/index.js';
import { loadFull } from '../../core/projects.routes.js';

/**
 * Fase 3 — Análise do research.
 *
 * A IA é acionada a pedido (POST /generate) e produz SUGESTÕES gravadas como
 * `draft`. Nada é considerado oficial até um humano validar (`validated`).
 * O utilizador pode editar, validar ou descartar cada item.
 */
export const analysisRouter = Router();

// ── Acionar a IA (a pedido do utilizador) ────────────────────────────────
analysisRouter.post('/:projectId/analysis/generate', async (req, res) => {
  const project = await loadFull(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

  const result = await ai.analyzeResearch({
    projectId: project.id,
    definition: project.definition,
    researchItems: project.researchItems,
  });

  // Regenerar substitui apenas as sugestões por validar (draft) da IA;
  // o que já foi validado por um humano é preservado.
  await prisma.$transaction([
    prisma.theme.deleteMany({ where: { projectId: project.id, status: 'draft', origin: 'ai' } }),
    prisma.insight.deleteMany({ where: { projectId: project.id, status: 'draft', origin: 'ai' } }),
    prisma.researchGap.deleteMany({ where: { projectId: project.id, status: 'draft', origin: 'ai' } }),
  ]);

  await prisma.$transaction([
    ...result.themes.map((t) =>
      prisma.theme.create({
        data: {
          id: t.id,
          projectId: project.id,
          label: t.label,
          description: t.description,
          sourceItemIds: JSON.stringify(t.sourceItemIds),
          origin: t.origin,
          status: t.status,
        },
      }),
    ),
    ...result.insights.map((i) =>
      prisma.insight.create({
        data: {
          id: i.id,
          projectId: project.id,
          text: i.text,
          themeId: i.themeId ?? null,
          sourceItemIds: JSON.stringify(i.sourceItemIds),
          confidence: i.confidence,
          origin: i.origin,
          status: i.status,
        },
      }),
    ),
    ...result.gaps.map((g) =>
      prisma.researchGap.create({
        data: {
          id: g.id,
          projectId: project.id,
          description: g.description,
          rationale: g.rationale,
          origin: g.origin,
          status: g.status,
        },
      }),
    ),
  ]);

  res.json(await loadFull(project.id));
});

// ── Validação humana (aprovar) ───────────────────────────────────────────
// Nota: usamos updatedAt=now via validatedAt; SQLite não tem "now()" no update
// do Prisma para campos arbitrários, por isso passamos a data explicitamente.
const now = () => new Date();

analysisRouter.patch('/:projectId/analysis/themes/:id/validate', async (req, res) => {
  const t = await prisma.theme.update({
    where: { id: req.params.id },
    data: { status: 'validated', validatedAt: now() },
  });
  res.json(mapTheme(t));
});

analysisRouter.patch('/:projectId/analysis/insights/:id/validate', async (req, res) => {
  const i = await prisma.insight.update({
    where: { id: req.params.id },
    data: { status: 'validated', validatedAt: now() },
  });
  res.json(mapInsight(i));
});

analysisRouter.patch('/:projectId/analysis/gaps/:id/validate', async (req, res) => {
  const g = await prisma.researchGap.update({
    where: { id: req.params.id },
    data: { status: 'validated', validatedAt: now() },
  });
  res.json(mapGap(g));
});

// ── Edição antes/depois de validar ───────────────────────────────────────
const themeEdit = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  sourceItemIds: z.array(z.string()).optional(),
});
analysisRouter.patch('/:projectId/analysis/themes/:id', async (req, res) => {
  const d = themeEdit.parse(req.body);
  const t = await prisma.theme.update({
    where: { id: req.params.id },
    data: {
      ...(d.label !== undefined ? { label: d.label } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.sourceItemIds !== undefined ? { sourceItemIds: JSON.stringify(d.sourceItemIds) } : {}),
    },
  });
  res.json(mapTheme(t));
});

const insightEdit = z.object({
  text: z.string().optional(),
  confidence: z.enum(['grounded', 'inferred']).optional(),
  themeId: z.string().nullable().optional(),
  sourceItemIds: z.array(z.string()).optional(),
});
analysisRouter.patch('/:projectId/analysis/insights/:id', async (req, res) => {
  const d = insightEdit.parse(req.body);
  const i = await prisma.insight.update({
    where: { id: req.params.id },
    data: {
      ...(d.text !== undefined ? { text: d.text } : {}),
      ...(d.confidence !== undefined ? { confidence: d.confidence } : {}),
      ...(d.themeId !== undefined ? { themeId: d.themeId } : {}),
      ...(d.sourceItemIds !== undefined ? { sourceItemIds: JSON.stringify(d.sourceItemIds) } : {}),
    },
  });
  res.json(mapInsight(i));
});

// ── Descartar (rejeitar sugestão) ────────────────────────────────────────
analysisRouter.delete('/:projectId/analysis/themes/:id', async (req, res) => {
  await prisma.theme.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
analysisRouter.delete('/:projectId/analysis/insights/:id', async (req, res) => {
  await prisma.insight.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
analysisRouter.delete('/:projectId/analysis/gaps/:id', async (req, res) => {
  await prisma.researchGap.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
