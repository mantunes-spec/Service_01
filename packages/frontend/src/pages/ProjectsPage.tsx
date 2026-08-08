import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectSummary } from 'shared';
import { PHASES } from 'shared';
import { api } from '../lib/api';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => api.listProjects().then(setProjects).catch((e) => setError(String(e)));
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createProject(name.trim(), clientName.trim() || undefined);
      setName('');
      setClientName('');
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar este projeto e todo o seu conteúdo?')) return;
    await api.deleteProject(id);
    load();
  };

  return (
    <div className="container">
      <div className="spread" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Estúdio de Service Design</h1>
          <p className="muted">Do briefing com o cliente à entrega de blueprints.</p>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="panel">
        <h2>Novo projeto</h2>
        <form onSubmit={create}>
          <div className="grid2">
            <div className="field">
              <label>Nome do projeto</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Renovar onboarding do serviço X" />
            </div>
            <div className="field">
              <label>Cliente (opcional)</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="ex.: Município de..." />
            </div>
          </div>
          <button className="primary" type="submit">Criar projeto</button>
        </form>
      </div>

      <h2>Projetos</h2>
      {projects.length === 0 ? (
        <div className="empty">Ainda não há projetos. Cria o primeiro acima.</div>
      ) : (
        <div className="stack">
          {projects.map((p) => (
            <div className="panel" key={p.id} style={{ marginBottom: 0 }}>
              <div className="spread">
                <div>
                  <Link to={`/projects/${p.id}`}><strong>{p.name}</strong></Link>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {p.clientName || 'Sem cliente'} · {p.researchCount} itens de research ·{' '}
                    Fase {p.currentPhase}: {PHASES.find((ph) => ph.id === p.currentPhase)?.label}
                  </div>
                </div>
                <div className="row">
                  <Link to={`/projects/${p.id}`}><button className="small">Abrir</button></Link>
                  <button className="small danger" onClick={() => remove(p.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
