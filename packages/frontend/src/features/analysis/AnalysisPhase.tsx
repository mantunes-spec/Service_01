import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Insight, ResearchGap, Theme } from 'shared';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { PhaseFooter } from '../../components/PhaseFooter';
import { IconCheck, IconGap, IconInfo, IconSparkles, IconTrash } from '../../components/icons';

export function AnalysisPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'validated'>('all');

  const keyOf = useMemo(() => {
    const m = new Map<string, string>();
    project.researchItems.forEach((r) => m.set(r.id, r.citationKey));
    return m;
  }, [project.researchItems]);
  const refs = (ids: string[]) => ids.map((id) => keyOf.get(id) ?? id.slice(0, 6));

  const generate = async () => {
    setBusy(true);
    try {
      await api.generateAnalysis(project.id);
      toast.ok('Síntese gerada — revê e valida as sugestões');
      await reload();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const { themes, insights, gaps } = project.analysis;
  const hasResearch = project.researchItems.length > 0;
  const total = themes.length + insights.length + gaps.length;
  const drafts = [...themes, ...insights, ...gaps].filter((x) => x.status === 'draft').length;
  const validated = themes.filter((t) => t.status === 'validated').length + insights.filter((i) => i.status === 'validated').length;

  const showByFilter = (status: string) => filter === 'all' || status === filter;
  const fThemes = themes.filter((t) => showByFilter(t.status));
  const fInsights = insights.filter((i) => showByFilter(i.status));
  const fGaps = gaps.filter((g) => showByFilter(g.status));

  const validate = async (fn: Promise<unknown>, msg: string) => {
    try { await fn; toast.ok(msg); await reload(); } catch (e) { toast.error(String(e)); }
  };

  return (
    <>
      <div className="panel">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div className="stats">
            <div className="stat"><div className="stat__num">{themes.length}</div><div className="stat__label">Temas</div></div>
            <div className="stat"><div className="stat__num">{insights.length}</div><div className="stat__label">Insights</div></div>
            <div className="stat"><div className="stat__num">{gaps.length}</div><div className="stat__label">Lacunas</div></div>
            <div className="stat"><div className="stat__num" style={{ color: 'var(--c-ok)' }}>{validated}</div><div className="stat__label">Validados</div></div>
          </div>
          <button className="btn btn--primary" onClick={generate} disabled={busy || !hasResearch}>
            <IconSparkles size={16} /> {busy ? 'A analisar…' : total > 0 ? 'Voltar a sintetizar' : 'Sintetizar com IA'}
          </button>
        </div>
        <div className="banner banner--info" style={{ marginTop: '1rem' }}>
          <IconInfo size={17} />
          <span>
            A IA sintetiza <strong>a partir do material carregado</strong> e cita as fontes; onde falta
            informação, sinaliza lacunas em vez de inventar. Cada sugestão nasce como rascunho e só
            conta depois de a <strong>validares</strong>.
            {drafts > 0 && <> Tens <strong>{drafts}</strong> por rever.</>}
          </span>
        </div>
        {!hasResearch && <p className="muted" style={{ marginTop: '0.8rem' }}>Não há research para analisar — adiciona material na fase anterior.</p>}
      </div>

      {busy && (
        <div className="stack mt-2">
          {[0, 1, 2].map((i) => <div key={i} className="card"><div className="skeleton" style={{ height: 44 }} /></div>)}
        </div>
      )}

      {total > 0 && !busy && (
        <>
          <div className="toolbar mt-2">
            <div className="segmented">
              <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Todos</button>
              <button className={filter === 'draft' ? 'is-on' : ''} onClick={() => setFilter('draft')}>Por rever</button>
              <button className={filter === 'validated' ? 'is-on' : ''} onClick={() => setFilter('validated')}>Validados</button>
            </div>
          </div>

          {/* Temas */}
          <div className="section-title" style={{ marginTop: '0.5rem' }}>Temas</div>
          <div className="stack">
            {fThemes.map((t: Theme) => (
              <div className={`card card--${t.status}`} key={t.id}>
                <div className="card__head">
                  <div className="flex-1">
                    <div className="cluster" style={{ gap: '0.4rem' }}>
                      <strong className="wrap-text">{t.label}</strong>
                      {t.origin === 'ai' && <span className="pill pill--ai"><IconSparkles size={12} /> IA</span>}
                      <span className={`pill pill--${t.status}`}>{t.status === 'validated' ? 'validado' : 'rascunho'}</span>
                    </div>
                    <p className="muted wrap-text" style={{ margin: '0.35rem 0' }}>{t.description}</p>
                    <SourceRefs keys={refs(t.sourceItemIds)} />
                  </div>
                  <Actions
                    validated={t.status === 'validated'}
                    onValidate={() => validate(api.validateTheme(project.id, t.id), 'Tema validado')}
                    onDelete={() => validate(api.deleteTheme(project.id, t.id), 'Tema descartado')}
                  />
                </div>
              </div>
            ))}
            {fThemes.length === 0 && <p className="muted">Nenhum tema neste filtro.</p>}
          </div>

          {/* Insights */}
          <div className="section-title">Insights</div>
          <div className="stack">
            {fInsights.map((i: Insight) => (
              <div className={`card card--${i.status}`} key={i.id}>
                <div className="card__head">
                  <div className="flex-1">
                    <div className="cluster" style={{ gap: '0.4rem' }}>
                      {i.origin === 'ai' && <span className="pill pill--ai"><IconSparkles size={12} /> IA</span>}
                      <span className={`pill pill--${i.confidence}`}>{i.confidence === 'grounded' ? 'ancorado' : 'inferido'}</span>
                      <span className={`pill pill--${i.status}`}>{i.status === 'validated' ? 'validado' : 'rascunho'}</span>
                    </div>
                    <p className="wrap-text" style={{ margin: '0.4rem 0 0.3rem' }}>{i.text}</p>
                    <SourceRefs keys={refs(i.sourceItemIds)} />
                  </div>
                  <Actions
                    validated={i.status === 'validated'}
                    onValidate={() => validate(api.validateInsight(project.id, i.id), 'Insight validado')}
                    onDelete={() => validate(api.deleteInsight(project.id, i.id), 'Insight descartado')}
                  />
                </div>
              </div>
            ))}
            {fInsights.length === 0 && <p className="muted">Nenhum insight neste filtro.</p>}
          </div>

          {/* Lacunas */}
          <div className="section-title">Lacunas de informação</div>
          <div className="stack">
            {fGaps.map((g: ResearchGap) => (
              <div className={`card card--${g.status}`} key={g.id}>
                <div className="card__head">
                  <div className="flex-1">
                    <div className="cluster" style={{ gap: '0.4rem' }}>
                      <span style={{ color: 'var(--c-warn)' }}><IconGap size={16} /></span>
                      <strong className="wrap-text">{g.description}</strong>
                      <span className={`pill pill--${g.status}`}>{g.status === 'validated' ? 'reconhecida' : 'rascunho'}</span>
                    </div>
                    <p className="muted wrap-text" style={{ marginTop: '0.35rem' }}>{g.rationale}</p>
                  </div>
                  <Actions
                    validated={g.status === 'validated'}
                    validateLabel="Reconhecer"
                    onValidate={() => validate(api.validateGap(project.id, g.id), 'Lacuna reconhecida')}
                    onDelete={() => validate(api.deleteGap(project.id, g.id), 'Lacuna descartada')}
                  />
                </div>
              </div>
            ))}
            {fGaps.length === 0 && <p className="muted">Sem lacunas neste filtro.</p>}
          </div>
        </>
      )}

      {total === 0 && !busy && hasResearch && (
        <div className="empty mt-2">
          <div className="empty__icon"><IconSparkles /></div>
          <div className="empty__title">Ainda sem análise</div>
          <div>Carrega em “Sintetizar com IA” para gerar temas, insights e lacunas a partir do research.</div>
        </div>
      )}

      <PhaseFooter projectId={project.id} current="analysis" />
    </>
  );
}

function SourceRefs({ keys }: { keys: string[] }) {
  if (keys.length === 0) return <span className="faint" style={{ fontSize: '0.8rem' }}>Sem fontes</span>;
  return (
    <div className="chips">
      <span className="faint" style={{ fontSize: '0.8rem', alignSelf: 'center' }}>Fontes:</span>
      {keys.map((k) => <span className="pill pill--key" key={k}>{k}</span>)}
    </div>
  );
}

function Actions({
  validated, onValidate, onDelete, validateLabel = 'Validar',
}: { validated: boolean; onValidate: () => void; onDelete: () => void; validateLabel?: string }) {
  return (
    <div className="row">
      {!validated && (
        <button className="btn btn--subtle btn--sm" onClick={onValidate}><IconCheck size={15} /> {validateLabel}</button>
      )}
      <button className="btn btn--ghost btn--icon" title="Descartar" onClick={onDelete}><IconTrash size={16} /></button>
    </div>
  );
}
