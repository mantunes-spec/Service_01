import type { AIProvider } from './AIProvider.js';
import { ClaudeProvider } from './ClaudeProvider.js';
import { MockProvider } from './MockProvider.js';

export type { AIProvider } from './AIProvider.js';

/**
 * Fábrica da camada de IA. Escolhe a implementação com base em env, mas o
 * resto da aplicação só conhece o tipo `AIProvider`.
 */
export function createAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn(
        '[ai] AI_PROVIDER=claude mas ANTHROPIC_API_KEY não definida — a usar MockProvider.',
      );
      return new MockProvider();
    }
    return new ClaudeProvider(apiKey, process.env.ANTHROPIC_MODEL);
  }

  return new MockProvider();
}

/** Instância única usada pelas rotas. */
export const ai: AIProvider = createAIProvider();
