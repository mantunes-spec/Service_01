import { nanoid } from 'nanoid';
import type {
  AnalyzeRequest,
  AnalyzeResult,
  Insight,
  ResearchGap,
  Theme,
} from 'shared';
import type { AIProvider } from './AIProvider.js';

/**
 * Provider simulado — permite ter o fluxo end-to-end a funcionar sem custos
 * nem chave de API. Produz sugestões plausíveis e DETERMINISTICAS a partir do
 * material real do projeto (não inventa fontes: cita sempre itens existentes),
 * respeitando o mesmo contrato que o provider real de Claude usará.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async analyzeResearch(req: AnalyzeRequest): Promise<AnalyzeResult> {
    const items = req.researchItems;
    const allIds = items.map((i) => i.id);

    // Sem material → não há nada a sintetizar; só uma lacuna óbvia.
    if (items.length === 0) {
      const gap: ResearchGap = {
        id: nanoid(),
        projectId: req.projectId,
        description: 'Ainda não existe material de research carregado.',
        rationale:
          'Sem fontes, qualquer análise seria especulação. Carregue notas, ' +
          'entrevistas ou documentos antes de sintetizar.',
        origin: 'ai',
        status: 'draft',
        validatedAt: null,
      };
      return { themes: [], insights: [], gaps: [gap] };
    }

    // Agrupa itens por tag mais comum como proxy simples de "tema".
    const byTag = new Map<string, string[]>();
    for (const item of items) {
      const key = item.tags[0] ?? item.type;
      const list = byTag.get(key) ?? [];
      list.push(item.id);
      byTag.set(key, list);
    }

    const themes: Theme[] = [...byTag.entries()].map(([tag, ids]) => ({
      id: nanoid(),
      projectId: req.projectId,
      label: `Tema: ${tag}`,
      description: `Sinais recorrentes no material relacionado com "${tag}".`,
      sourceItemIds: ids,
      origin: 'ai',
      status: 'draft',
      validatedAt: null,
    }));

    const insights: Insight[] = items.slice(0, 3).map((item, idx) => ({
      id: nanoid(),
      projectId: req.projectId,
      text:
        `A partir de "${item.title}" (${item.citationKey}), emerge um padrão ` +
        `a confirmar com as restantes fontes.`,
      themeId: themes[idx % Math.max(themes.length, 1)]?.id ?? null,
      sourceItemIds: [item.id],
      // Ancorado numa fonte concreta → grounded.
      confidence: 'grounded',
      origin: 'ai',
      status: 'draft',
      validatedAt: null,
    }));

    // Uma inferência transversal marcada explicitamente como "inferred".
    if (items.length >= 2) {
      insights.push({
        id: nanoid(),
        projectId: req.projectId,
        text:
          'Possível relação entre os vários pontos de contacto — inferência ' +
          'que precisa de validação com o cliente.',
        themeId: themes[0]?.id ?? null,
        sourceItemIds: allIds.slice(0, 2),
        confidence: 'inferred',
        origin: 'ai',
        status: 'draft',
        validatedAt: null,
      });
    }

    const gaps: ResearchGap[] = [];
    const hasInterview = items.some((i) => i.type === 'interview');
    if (!hasInterview) {
      gaps.push({
        id: nanoid(),
        projectId: req.projectId,
        description: 'Não há entrevistas com utilizadores finais no material.',
        rationale:
          'Os documentos existentes dão contexto, mas faltam vozes diretas ' +
          'dos utilizadores para fundamentar os insights.',
        origin: 'ai',
        status: 'draft',
        validatedAt: null,
      });
    }

    return { themes, insights, gaps };
  }
}
