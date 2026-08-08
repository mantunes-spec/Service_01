import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import type { Project } from 'shared';
import { PHASES } from 'shared';
import { api } from '../lib/api';

/** Contexto passado às fases: o projeto e uma função para o recarregar. */
export interface ProjectContext {
  project: Project;
  reload: () => Promise<void>;
}

export function ProjectLayout() {
  const { projectId } = useParams();
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

  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!project) return <div className="container"><p className="muted">A carregar…</p></div>;

  const ctx: ProjectContext = { project, reload };

  return (
    <>
      <div className="topbar">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="spread">
            <div>
              <Link to="/" className="muted">← Projetos</Link>
              <h1 style={{ margin: '0.2rem 0 0' }}>{project.name}</h1>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {project.definition.client.name || 'Sem cliente definido'}
              </span>
            </div>
          </div>
          <nav className="phasenav">
            {PHASES.map((ph) => (
              <NavLink
                key={ph.key}
                to={ph.key}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="num">{ph.id}</span>
                {ph.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="container">
        <Outlet context={ctx} />
      </div>
    </>
  );
}
