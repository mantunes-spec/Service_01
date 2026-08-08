import type { AnalyzeRequest, AnalyzeResult } from 'shared';

/**
 * Contrato da camada de IA. Toda a lógica de negócio depende apenas desta
 * interface — nunca de um modelo concreto. Trocar de modelo/fornecedor =
 * fornecer outra implementação, sem tocar nas rotas ou no frontend.
 *
 * Regras do produto refletidas no contrato:
 *  - A IA é acionada a pedido (é um método chamado explicitamente).
 *  - Os outputs são SUGESTÕES (`status: 'draft'`), nunca dados guardados.
 *  - A IA sintetiza a partir das fontes e sinaliza lacunas em vez de as
 *    preencher com achismos.
 */
export interface AIProvider {
  readonly name: string;

  /**
   * Sintetiza temas e insights a partir do material de research e identifica
   * lacunas de informação. Devolve sempre sugestões por validar.
   */
  analyzeResearch(req: AnalyzeRequest): Promise<AnalyzeResult>;
}
