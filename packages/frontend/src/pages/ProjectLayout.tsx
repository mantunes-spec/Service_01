import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import type { Project } from 'shared';
import { api } from '../lib/api';
import { computeProgress, overallPercent, type PhaseProgress } from '../lib/progress';
import {
  IconArrowLeft, IconCheck, IconCompass, IconFolder, IconLayers, IconSparkles,
} from '../components/icons';

/** Contexto passado às fases: o projeto e uma função para o recarregar. */
export interface ProjectContext {
  project: Project;
  reload: () => Promise<void>;
  progress: PhaseProgress[];
}

const PHASE_META: Record<string, { desc: string; icon: React.ReactNode }> = {
  definition: { desc: 'Cliente, objetivos e outcomes esperados.', icon: <IconCompass /> },
  research: { desc: 'Material que alimenta o projeto — com sourcing fiel.', icon: <IconFolder /> },
  analysis: { desc: 'Síntese assistida por IA, sempre sob a tua validação.', icon: <IconSparkles /> },
  blueprints: { desc: 'Mapas de serviço em swimlanes.', icon: <IconLayers /> },
};

export function ProjectLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    try {
      setProject(await api.getProject(projectId));
    } catch (e) {
      setError(String(e));
    }
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const progress = useMemo(() => (project ? computeProgress(project) : []), [project]);

  // Regista a fase mais avançada que o utilizador visitou (alimenta o dashboard).
  const activeKeyForBump = location.pathname.split('/').pop() || 'definition';
  useEffect(() => {
    if (!project) return;
    const order = ['definition', 'research', 'analysis', 'blueprints'];
    const target = order.indexOf(activeKeyForBump) + 1;
    if (target > 0 && target > project.currentPhase) {
      api.setPhase(project.id, target).then(setProject).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKeyForBump, project?.id]);

  if (error) {
    return <div className="wrap-centered"><div className="error">{error}</div></div>;
  }
  if (!project) {
    return (
      <div className="app">
        <aside className="sidebar" />
        <main className="main"><div className="main__body"><div className="skeleton" style={{ height: 40, width: 240 }} /></div></main>
      </div>
    );
  }

  const activeKey = location.pathname.split('/').pop() || 'definition';
  const activePhase = PHASE_META[activeKey] ?? PHASE_META.definition;
  const activeIdx = progress.findIndex((p) => p.key === activeKey);
  const pct = overallPercent(progress);
  const ctx: ProjectContext = { project, reload, progress };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo"><IconLayers size={17} /></span>
          <span>Service Studio</span>
        </div>

        <div className="sidebar__project">
          <div className="eyebrow">Projeto</div>
          <div className="name wrap-text">{project.name}</div>
          <div className="client">{project.definition.client.name || 'Sem cliente definido'}</div>
        </div>

        <nav className="sidebar__nav">
          <div className="nav-label">Fluxo do projeto</div>
          {progress.map((ph) => (
            <NavLink
              key={ph.key}
              to={ph.key}
              className={({ isActive }) =>
                `navitem is-${ph.state}${isActive ? ' is-active' : ''}`
              }
            >
              <span className="navitem__marker">
                {ph.state === 'done' ? <IconCheck size={15} /> : ph.id}
              </span>
              <span className="navitem__body">
                <span className="navitem__label">{ph.label}</span>
                <span className="navitem__meta">{ph.meta}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="progress__label">
            <span>Progresso</span><span>{pct}%</span>
          </div>
          <div className="progress"><div className="progress__fill" style={{ width: `${pct}%` }} /></div>
          <Link to="/" className="btn btn--ghost btn--sm" style={{ marginTop: '0.8rem', paddingLeft: 0 }}>
            <IconArrowLeft size={15} /> Todos os projetos
          </Link>
        </div>
      </aside>

      <main className="main">
        <header className="main__header">
          <div className="row">
            <span style={{ color: 'var(--c-brand)' }}>{activePhase.icon}</span>
            <div>
              <div className="main__title">
                {activeIdx >= 0 ? `${activeIdx + 1}. ` : ''}{progress[activeIdx]?.label ?? ''}
              </div>
              <div className="main__subtitle">{activePhase.desc}</div>
            </div>
          </div>
        </header>
        <div className={`main__body${activeKey === 'blueprints' ? ' main__body--wide' : ''}`}>
          <Outlet context={ctx} />
        </div>
      </main>
    </div>
  );
}
