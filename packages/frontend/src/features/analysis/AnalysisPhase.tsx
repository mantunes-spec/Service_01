import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';

/**
 * Fase 3 — Análise. A IA é acionada a pedido e devolve sugestões (draft).
 * O utilizador valida ou descarta cada uma. Nada é oficial sem validação.
 */
export function AnalysisPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapa id → citationKey, para mostrar as fontes de cada sugestão.
  const keyOf = useMemo(() => {
    const m = new Map<string, string>();
    project.researchItems.forEach((r) => m.set(r.id, r.citationKey));
    return m;
  }, [project.researchItems]);

  const refs = (ids: string[]) =>
    ids.map((id) => keyOf.get(id) ?? id.slice(0, 6)).join(', ') || '—';

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.generateAnalysis(project.id);
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const { themes, insights, gaps } = project.analysis;
  const hasResearch = project.researchItems.length > 0;

  return (
    <>
      <div className="spread">
        <h2>3 · Análise do research</h2>
        <button className="primary" onClick={generate} disabled={busy}>
          {busy ? 'A analisar…' : 'Sintetizar com IA'}
        </button>
      </div>
      <div className="help">
        A IA sintetiza <strong>a partir do material carregado</strong> e sinaliza lacunas em vez de
        inventar. Cada sugestão nasce como <span className="badge draft">rascunho</span> e só conta
        depois de a validares.
      </div>
      {!hasResearch && <p className="muted" style={{ marginTop: '0.6rem' }}>Não há research para analisar. Adiciona material na Fase 2.</p>}
      {error && <div className="error">{error}</div>}

      {/* Temas */}
      <h3 style={{ marginTop: '1.2rem' }}>Temas ({themes.length})</h3>
      <div className="stack">
        {themes.map((t) => (
          <div className={`card ${t.status}`} key={t.id}>
            <div className="spread">
              <div>
                <strong>{t.label}</strong>{' '}
                {t.origin === 'ai' && <span className="badge ai">IA</span>}{' '}
                <span className={`badge ${t.status}`}>{t.status === 'validated' ? 'validado' : 'rascunho'}</span>
              </div>
              <div className="row">
                {t.status !== 'validated' && (
                  <button className="small primary" onClick={async () => { await api.validateTheme(project.id, t.id); reload(); }}>Validar</button>
                )}
                <button className="small danger" onClick={async () => { await api.deleteTheme(project.id, t.id); reload(); }}>Descartar</button>
              </div>
            </div>
            <p className="muted" style={{ margin: '0.3rem 0' }}>{t.description}</p>
            <span className="muted" style={{ fontSize: '0.82rem' }}>Fontes: {refs(t.sourceItemIds)}</span>
          </div>
        ))}
        {themes.length === 0 && <p className="muted">Sem temas ainda.</p>}
      </div>

      {/* Insights */}
      <h3 style={{ marginTop: '1.2rem' }}>Insights ({insights.length})</h3>
      <div className="stack">
        {insights.map((i) => (
          <div className={`card ${i.status}`} key={i.id}>
            <div className="spread">
              <div style={{ flex: 1 }}>
                {i.origin === 'ai' && <span className="badge ai">IA</span>}{' '}
                <span className={`badge ${i.confidence}`}>{i.confidence === 'grounded' ? 'ancorado' : 'inferido'}</span>{' '}
                <span className={`badge ${i.status}`}>{i.status === 'validated' ? 'validado' : 'rascunho'}</span>
                <p style={{ margin: '0.4rem 0 0.2rem' }}>{i.text}</p>
                <span className="muted" style={{ fontSize: '0.82rem' }}>Fontes: {refs(i.sourceItemIds)}</span>
              </div>
              <div className="row">
                {i.status !== 'validated' && (
                  <button className="small primary" onClick={async () => { await api.validateInsight(project.id, i.id); reload(); }}>Validar</button>
                )}
                <button className="small danger" onClick={async () => { await api.deleteInsight(project.id, i.id); reload(); }}>Descartar</button>
              </div>
            </div>
          </div>
        ))}
        {insights.length === 0 && <p className="muted">Sem insights ainda.</p>}
      </div>

      {/* Lacunas */}
      <h3 style={{ marginTop: '1.2rem' }}>Lacunas de informação ({gaps.length})</h3>
      <div className="stack">
        {gaps.map((g) => (
          <div className={`card ${g.status}`} key={g.id}>
            <div className="spread">
              <div style={{ flex: 1 }}>
                <span className="badge ai">IA</span>{' '}
                <span className={`badge ${g.status}`}>{g.status === 'validated' ? 'reconhecida' : 'rascunho'}</span>
                <p style={{ margin: '0.4rem 0 0.2rem' }}><strong>{g.description}</strong></p>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{g.rationale}</span>
              </div>
              <div className="row">
                {g.status !== 'validated' && (
                  <button className="small primary" onClick={async () => { await api.validateGap(project.id, g.id); reload(); }}>Reconhecer</button>
                )}
                <button className="small danger" onClick={async () => { await api.deleteGap(project.id, g.id); reload(); }}>Descartar</button>
              </div>
            </div>
          </div>
        ))}
        {gaps.length === 0 && <p className="muted">Sem lacunas assinaladas.</p>}
      </div>
    </>
  );
}
