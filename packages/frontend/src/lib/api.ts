/**
 * Cliente HTTP — única porta do frontend para o backend. Nenhum componente
 * fala com o servidor diretamente; todos passam por aqui.
 */
import type {
  Artefact,
  BlueprintContent,
  Insight,
  Project,
  ProjectSummary,
  ResearchItem,
  Theme,
} from 'shared';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ── Projetos ──────────────────────────────────────────────
  listProjects: () => req<ProjectSummary[]>('/projects'),
  getProject: (id: string) => req<Project>(`/projects/${id}`),
  createProject: (name: string, clientName?: string) =>
    req<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, clientName }),
    }),
  deleteProject: (id: string) => req<void>(`/projects/${id}`, { method: 'DELETE' }),
  setPhase: (id: string, currentPhase: number) =>
    req<Project>(`/projects/${id}/phase`, {
      method: 'PATCH',
      body: JSON.stringify({ currentPhase }),
    }),

  // ── Fase 1 — Definição ────────────────────────────────────
  saveDefinition: (id: string, definition: Project['definition']) =>
    req<Project>(`/projects/${id}/definition`, {
      method: 'PUT',
      body: JSON.stringify(definition),
    }),

  // ── Fase 2 — Research ─────────────────────────────────────
  addResearchText: (
    id: string,
    payload: {
      type: string;
      title: string;
      content: string;
      tags?: string[];
      author?: string;
    },
  ) =>
    req<ResearchItem>(`/projects/${id}/research/text`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addResearchFile: async (id: string, form: FormData) => {
    // multipart: NÃO definir content-type manualmente.
    const res = await fetch(`${BASE}/projects/${id}/research/file`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ResearchItem;
  },
  deleteResearch: (id: string, itemId: string) =>
    req<void>(`/projects/${id}/research/${itemId}`, { method: 'DELETE' }),
  fileUrl: (id: string, itemId: string) =>
    `${BASE}/projects/${id}/research/${itemId}/file`,

  // ── Fase 3 — Análise ──────────────────────────────────────
  generateAnalysis: (id: string) =>
    req<Project>(`/projects/${id}/analysis/generate`, { method: 'POST' }),
  validateTheme: (id: string, tid: string) =>
    req<Theme>(`/projects/${id}/analysis/themes/${tid}/validate`, { method: 'PATCH' }),
  validateInsight: (id: string, iid: string) =>
    req<Insight>(`/projects/${id}/analysis/insights/${iid}/validate`, { method: 'PATCH' }),
  validateGap: (id: string, gid: string) =>
    req<unknown>(`/projects/${id}/analysis/gaps/${gid}/validate`, { method: 'PATCH' }),
  deleteTheme: (id: string, tid: string) =>
    req<void>(`/projects/${id}/analysis/themes/${tid}`, { method: 'DELETE' }),
  deleteInsight: (id: string, iid: string) =>
    req<void>(`/projects/${id}/analysis/insights/${iid}`, { method: 'DELETE' }),
  deleteGap: (id: string, gid: string) =>
    req<void>(`/projects/${id}/analysis/gaps/${gid}`, { method: 'DELETE' }),

  // ── Fase 4 — Blueprints ───────────────────────────────────
  createArtefact: (id: string, title: string, type = 'service_blueprint') =>
    req<Artefact>(`/projects/${id}/artefacts`, {
      method: 'POST',
      body: JSON.stringify({ title, type }),
    }),
  updateArtefact: (
    id: string,
    aid: string,
    payload: { title?: string; content?: BlueprintContent },
  ) =>
    req<Artefact>(`/projects/${id}/artefacts/${aid}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  validateArtefact: (id: string, aid: string) =>
    req<Artefact>(`/projects/${id}/artefacts/${aid}/validate`, { method: 'PATCH' }),
  deleteArtefact: (id: string, aid: string) =>
    req<void>(`/projects/${id}/artefacts/${aid}`, { method: 'DELETE' }),
};
