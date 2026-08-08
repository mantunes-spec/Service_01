/**
 * Tipos partilhados — a "verdade única" das entidades do domínio.
 *
 * Estes tipos são usados pelo backend (validação/persistência) e pelo frontend
 * (UI). O objeto central é `Project`, que acumula informação à medida que
 * avança pelas 4 fases do fluxo de service design.
 */

// ───────────────────────────── Validação humana ─────────────────────────────
//
// Princípio central do produto: a IA é assistente, nunca decide sozinha.
// Todo o output gerado por IA nasce como `draft` (uma sugestão) e só é
// considerado guardado/oficial quando um humano o valida (`validated`).

export type Origin = 'manual' | 'ai';
export type ReviewStatus = 'draft' | 'validated';

export interface Reviewable {
  /** Como a informação surgiu: introduzida à mão ou sugerida pela IA. */
  origin: Origin;
  /** `draft` = sugestão por rever; `validated` = aprovada por um humano. */
  status: ReviewStatus;
  /** ISO date; preenchido no momento da validação humana. */
  validatedAt?: string | null;
}

// ───────────────────────────── Fases do fluxo ──────────────────────────────

export type Phase = 1 | 2 | 3 | 4;

export const PHASES: { id: Phase; key: string; label: string }[] = [
  { id: 1, key: 'definition', label: 'Definição do projeto' },
  { id: 2, key: 'research', label: 'Repositório de research' },
  { id: 3, key: 'analysis', label: 'Análise do research' },
  { id: 4, key: 'blueprints', label: 'Blueprints e mapas' },
];

// ───────────────────────────── Fase 1 — Definição ──────────────────────────

export interface Client {
  name: string;
  contact?: string;
  notes?: string;
}

export interface ProjectDefinition {
  client: Client;
  /** Objetivos do projeto. */
  objectives: string[];
  /** Outcomes esperados: o que muda no mundo se o projeto for bem-sucedido. */
  expectedOutcomes: string[];
}

// ───────────────────────────── Fase 2 — Research ───────────────────────────

export type ResearchItemType = 'note' | 'interview' | 'document';
export type ResearchSourceKind = 'pasted_text' | 'file';

/**
 * Um item do repositório de research. É a unidade de "verdade" que alimenta
 * toda a análise a jusante — por isso a nomenclatura (`citationKey`) e os
 * metadados de proveniência são de primeira classe: queremos sempre poder
 * fazer sourcing e referência fiel a este material.
 */
export interface ResearchItem {
  id: string;
  projectId: string;
  /** Ref estável e legível para citação, ex.: "R001", "ENT-cliente-01". */
  citationKey: string;
  type: ResearchItemType;
  title: string;
  sourceKind: ResearchSourceKind;
  /** Texto colado, transcrição ou extrato (para pesquisa/citação). */
  content?: string | null;
  /** Nome original do ficheiro carregado. */
  fileName?: string | null;
  /** Caminho no storage local (troca-se por object storage depois). */
  fileRef?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  tags: string[];
  /** Proveniência: quem produziu / de onde veio. */
  author?: string | null;
  /** Quando foi capturado no terreno (≠ createdAt no sistema). */
  capturedAt?: string | null;
  createdAt: string;
}

// ───────────────────────────── Fase 3 — Análise ────────────────────────────

/** Fidelidade da afirmação face às fontes. */
export type Confidence = 'grounded' | 'inferred';

export interface Theme extends Reviewable {
  id: string;
  projectId: string;
  label: string;
  description: string;
  /** Rastreabilidade: itens de research que suportam este tema. */
  sourceItemIds: string[];
}

export interface Insight extends Reviewable {
  id: string;
  projectId: string;
  text: string;
  themeId?: string | null;
  /** Rastreabilidade: itens de research que suportam este insight. */
  sourceItemIds: string[];
  /** `grounded` = ancorado nas fontes; `inferred` = inferência a confirmar. */
  confidence: Confidence;
}

/**
 * Lacuna de informação identificada pela IA. Em vez de "encher" a análise com
 * achismos, a IA sinaliza explicitamente o que falta saber — para o utilizador
 * decidir se recolhe mais research.
 */
export interface ResearchGap extends Reviewable {
  id: string;
  projectId: string;
  /** Que informação falta. */
  description: string;
  /** Porquê a IA considera que é uma lacuna. */
  rationale: string;
}

export interface ProjectAnalysis {
  themes: Theme[];
  insights: Insight[];
  gaps: ResearchGap[];
}

// ───────────────────────────── Fase 4 — Artefactos ─────────────────────────

export type ArtefactType = 'service_blueprint' | 'service_map';

/** Camadas tradicionais de um service blueprint. */
export type BlueprintLaneKey =
  | 'physical_evidence'
  | 'customer_actions'
  | 'frontstage'
  | 'backstage'
  | 'support_processes';

export interface BlueprintLane {
  key: BlueprintLaneKey;
  label: string;
  /** Uma célula por stage (mesmo comprimento que `stages`). */
  cells: string[];
}

export interface BlueprintContent {
  /** Colunas: fases/etapas da jornada. */
  stages: string[];
  /** Linhas: camadas do serviço × stages. */
  lanes: BlueprintLane[];
}

export interface Artefact extends Reviewable {
  id: string;
  projectId: string;
  type: ArtefactType;
  title: string;
  version: number;
  content: BlueprintContent;
}

// ───────────────────────────── Objeto central ──────────────────────────────

export interface Project {
  id: string;
  name: string;
  /** Até onde o projeto avançou no fluxo. */
  currentPhase: Phase;
  createdAt: string;
  updatedAt: string;

  definition: ProjectDefinition;
  researchItems: ResearchItem[];
  analysis: ProjectAnalysis;
  artefacts: Artefact[];
}

/** Resumo leve para listagens (sem carregar todo o conteúdo). */
export interface ProjectSummary {
  id: string;
  name: string;
  currentPhase: Phase;
  clientName: string;
  researchCount: number;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────────── Contratos de IA ─────────────────────────────
//
// Formato dos pedidos/respostas da camada de IA. Fica aqui (partilhado) para
// que a implementação do provider e o frontend concordem no contrato,
// independentemente do modelo por trás.

export interface AnalyzeRequest {
  projectId: string;
  definition: ProjectDefinition;
  researchItems: ResearchItem[];
}

/** Sugestões da IA — ainda por validar (status `draft`). */
export interface AnalyzeResult {
  themes: Theme[];
  insights: Insight[];
  gaps: ResearchGap[];
}

export const BLUEPRINT_LANES: { key: BlueprintLaneKey; label: string }[] = [
  { key: 'physical_evidence', label: 'Evidência física' },
  { key: 'customer_actions', label: 'Ações do cliente' },
  { key: 'frontstage', label: 'Frontstage (visível)' },
  { key: 'backstage', label: 'Backstage (invisível)' },
  { key: 'support_processes', label: 'Processos de suporte' },
];
