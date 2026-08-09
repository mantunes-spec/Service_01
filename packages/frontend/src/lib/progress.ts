/** Cálculo do progresso do projeto por fase — alimenta a navegação e o shell. */
import type { Project, Phase } from 'shared';

export type PhaseState = 'todo' | 'active' | 'done';

export interface PhaseProgress {
  id: Phase;
  key: string;
  label: string;
  /** Estado derivado dos dados (não da navegação). */
  state: PhaseState;
  /** Texto curto de contexto para a navegação. */
  meta: string;
}

export function computeProgress(p: Project): PhaseProgress[] {
  const d = p.definition;
  const definitionDone =
    !!d.client.name && d.objectives.length > 0 && d.expectedOutcomes.length > 0;
  const definitionStarted =
    !!d.client.name || d.objectives.length > 0 || d.expectedOutcomes.length > 0;

  const research = p.researchItems.length;

  const { themes, insights, gaps } = p.analysis;
  const analysisTotal = themes.length + insights.length + gaps.length;
  const analysisValidated =
    themes.filter((t) => t.status === 'validated').length +
    insights.filter((i) => i.status === 'validated').length;

  const artefacts = p.artefacts.length;
  const artefactsValidated = p.artefacts.filter((a) => a.status === 'validated').length;

  return [
    {
      id: 1, key: 'definition', label: 'Definição',
      state: definitionDone ? 'done' : definitionStarted ? 'active' : 'todo',
      meta: definitionDone ? 'Completa' : definitionStarted ? 'Em curso' : 'Por preencher',
    },
    {
      id: 2, key: 'research', label: 'Research',
      state: research > 0 ? 'done' : 'todo',
      meta: research > 0 ? `${research} ${research === 1 ? 'item' : 'itens'}` : 'Vazio',
    },
    {
      id: 3, key: 'analysis', label: 'Análise',
      state: analysisValidated > 0 ? 'done' : analysisTotal > 0 ? 'active' : 'todo',
      meta:
        analysisTotal === 0 ? 'Por gerar'
          : analysisValidated > 0 ? `${analysisValidated} validados`
          : `${analysisTotal} por rever`,
    },
    {
      id: 4, key: 'blueprints', label: 'Blueprints',
      state: artefactsValidated > 0 ? 'done' : artefacts > 0 ? 'active' : 'todo',
      meta:
        artefacts === 0 ? 'Nenhum'
          : artefactsValidated > 0 ? `${artefactsValidated} validados`
          : `${artefacts} rascunho${artefacts === 1 ? '' : 's'}`,
    },
  ];
}

/** Percentagem global (fases "done" / 4). */
export function overallPercent(progress: PhaseProgress[]): number {
  const done = progress.filter((p) => p.state === 'done').length;
  return Math.round((done / progress.length) * 100);
}
