/**
 * Mapeadores entre linhas Prisma (SQLite) e os tipos de domínio partilhados.
 *
 * Concentrar aqui a (de)serialização de JSON e datas mantém as rotas limpas e
 * facilita trocar a persistência depois (ex.: Postgres com colunas nativas).
 */
import type {
  Artefact,
  BlueprintContent,
  Confidence,
  Insight,
  Origin,
  Project,
  ProjectSummary,
  ResearchGap,
  ResearchItem,
  ResearchItemType,
  ResearchSourceKind,
  ReviewStatus,
  Theme,
} from 'shared';

const toIso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

const parseArray = (json: string): string[] => {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export const mapResearchItem = (r: any): ResearchItem => ({
  id: r.id,
  projectId: r.projectId,
  citationKey: r.citationKey,
  type: r.type as ResearchItemType,
  title: r.title,
  sourceKind: r.sourceKind as ResearchSourceKind,
  content: r.content ?? null,
  fileName: r.fileName ?? null,
  fileRef: r.fileRef ?? null,
  mimeType: r.mimeType ?? null,
  fileSize: r.fileSize ?? null,
  tags: parseArray(r.tags),
  author: r.author ?? null,
  capturedAt: toIso(r.capturedAt),
  createdAt: r.createdAt.toISOString(),
});

export const mapTheme = (t: any): Theme => ({
  id: t.id,
  projectId: t.projectId,
  label: t.label,
  description: t.description,
  sourceItemIds: parseArray(t.sourceItemIds),
  origin: t.origin as Origin,
  status: t.status as ReviewStatus,
  validatedAt: toIso(t.validatedAt),
});

export const mapInsight = (i: any): Insight => ({
  id: i.id,
  projectId: i.projectId,
  text: i.text,
  themeId: i.themeId ?? null,
  sourceItemIds: parseArray(i.sourceItemIds),
  confidence: i.confidence as Confidence,
  origin: i.origin as Origin,
  status: i.status as ReviewStatus,
  validatedAt: toIso(i.validatedAt),
});

export const mapGap = (g: any): ResearchGap => ({
  id: g.id,
  projectId: g.projectId,
  description: g.description,
  rationale: g.rationale,
  origin: g.origin as Origin,
  status: g.status as ReviewStatus,
  validatedAt: toIso(g.validatedAt),
});

export const mapArtefact = (a: any): Artefact => {
  let content: BlueprintContent = { stages: [], lanes: [] };
  try {
    content = JSON.parse(a.content);
  } catch {
    /* mantém o default vazio */
  }
  return {
    id: a.id,
    projectId: a.projectId,
    type: a.type,
    title: a.title,
    version: a.version,
    content,
    origin: a.origin as Origin,
    status: a.status as ReviewStatus,
    validatedAt: toIso(a.validatedAt),
  };
};

/** Projeto completo (com todas as coleções carregadas). */
export const mapProject = (p: any): Project => ({
  id: p.id,
  name: p.name,
  currentPhase: p.currentPhase,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
  definition: {
    client: {
      name: p.clientName,
      contact: p.clientContact ?? undefined,
      notes: p.clientNotes ?? undefined,
    },
    objectives: parseArray(p.objectives),
    expectedOutcomes: parseArray(p.expectedOutcomes),
  },
  researchItems: (p.researchItems ?? []).map(mapResearchItem),
  analysis: {
    themes: (p.themes ?? []).map(mapTheme),
    insights: (p.insights ?? []).map(mapInsight),
    gaps: (p.gaps ?? []).map(mapGap),
  },
  artefacts: (p.artefacts ?? []).map(mapArtefact),
});

export const mapProjectSummary = (p: any): ProjectSummary => ({
  id: p.id,
  name: p.name,
  currentPhase: p.currentPhase,
  clientName: p.clientName,
  researchCount: p._count?.researchItems ?? 0,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});
