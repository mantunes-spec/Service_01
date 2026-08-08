import { nanoid } from 'nanoid';
import type {
  AnalyzeRequest,
  AnalyzeResult,
  Confidence,
} from 'shared';
import type { AIProvider } from './AIProvider.js';

/**
 * Implementação real com a Claude API. Não é usada por defeito (AI_PROVIDER=mock);
 * fica pronta para ligar mais tarde definindo AI_PROVIDER=claude e ANTHROPIC_API_KEY.
 *
 * Usa `fetch` diretamente para não acoplar o resto do código a um SDK. Toda a
 * lógica de negócio continua a depender apenas da interface `AIProvider`.
 */
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-sonnet-5',
  ) {}

  async analyzeResearch(req: AnalyzeRequest): Promise<AnalyzeResult> {
    const sources = req.researchItems
      .map(
        (i) =>
          `- [${i.citationKey}] (id=${i.id}, tipo=${i.type}) ${i.title}\n` +
          `  ${(i.content ?? '(ficheiro sem texto extraído)').slice(0, 2000)}`,
      )
      .join('\n');

    const system =
      'És assistente de um service designer. Sintetizas temas e insights ' +
      'ESTRITAMENTE a partir das fontes fornecidas. Nunca inventes fontes: ' +
      'cita sempre os ids reais. Quando faltar informação, declara-a como ' +
      'lacuna em vez de especular. Marca cada insight como "grounded" (ancorado ' +
      'nas fontes) ou "inferred" (inferência a confirmar). Responde só com JSON.';

    const prompt =
      `Objetivos do projeto: ${req.definition.objectives.join('; ') || '—'}\n` +
      `Outcomes esperados: ${req.definition.expectedOutcomes.join('; ') || '—'}\n\n` +
      `Fontes de research:\n${sources || '(nenhuma)'}\n\n` +
      'Devolve JSON com esta forma exata:\n' +
      '{"themes":[{"label":"","description":"","sourceItemIds":[]}],' +
      '"insights":[{"text":"","confidence":"grounded|inferred","sourceItemIds":[]}],' +
      '"gaps":[{"description":"","rationale":""}]}';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
    }

    const data: any = await res.json();
    const text: string = data?.content?.[0]?.text ?? '{}';
    const parsed = this.safeParse(text);

    // Normaliza para o contrato, forçando sempre status 'draft' (por validar).
    return {
      themes: (parsed.themes ?? []).map((t: any) => ({
        id: nanoid(),
        projectId: req.projectId,
        label: String(t.label ?? ''),
        description: String(t.description ?? ''),
        sourceItemIds: Array.isArray(t.sourceItemIds) ? t.sourceItemIds : [],
        origin: 'ai' as const,
        status: 'draft' as const,
        validatedAt: null,
      })),
      insights: (parsed.insights ?? []).map((i: any) => ({
        id: nanoid(),
        projectId: req.projectId,
        text: String(i.text ?? ''),
        themeId: null,
        sourceItemIds: Array.isArray(i.sourceItemIds) ? i.sourceItemIds : [],
        confidence: (i.confidence === 'inferred' ? 'inferred' : 'grounded') as Confidence,
        origin: 'ai' as const,
        status: 'draft' as const,
        validatedAt: null,
      })),
      gaps: (parsed.gaps ?? []).map((g: any) => ({
        id: nanoid(),
        projectId: req.projectId,
        description: String(g.description ?? ''),
        rationale: String(g.rationale ?? ''),
        origin: 'ai' as const,
        status: 'draft' as const,
        validatedAt: null,
      })),
    };
  }

  private safeParse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    }
  }
}
