import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectSummary } from 'shared';
import { PHASES } from 'shared';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { IconLayers, IconPlus, IconTrash } from '../components/icons';

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const load = () => api.listProjects().then(setProjects).catch((e) => toast.error(String(e)));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createProject(name.trim(), clientName.trim() || undefined);
      setName(''); setClientName('');
      toast.ok('Projeto criado');
      load();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!confirm('Eliminar este projeto e todo o seu conteúdo?')) return;
    await api.deleteProject(id);
    toast.ok('Projeto eliminado');
    load();
  };

  return (
    <div className="wrap-centered">
      <div className="row" style={{ marginBottom: '0.4rem' }}>
        <span className="sidebar__logo" style={{ width: 34, height: 34 }}><IconLayers size={19} /></span>
        <div>
          <h1>Service Studio</h1>
          <p className="muted">Do briefing com o cliente à entrega de blueprints.</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.4rem' }}>
        <div className="panel__title"><IconPlus size={17} /><h3>Novo projeto</h3></div>
        <form onSubmit={create}>
          <div className="grid2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field__label">Nome do projeto</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Renovar onboarding do serviço X" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field__label">Cliente <span className="faint">(opcional)</span></label>
              <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="ex.: Município de…" />
            </div>
          </div>
          <button className="btn btn--primary" type="submit" disabled={creating} style={{ marginTop: '1rem' }}>
            <IconPlus size={16} /> {creating ? 'A criar…' : 'Criar projeto'}
          </button>
        </form>
      </div>

      <div className="section-title">Projetos</div>

      {projects === null ? (
        <div className="grid-cards">
          {[0, 1, 2].map((i) => <div key={i} className="panel"><div className="skeleton" style={{ height: 70 }} /></div>)}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty">
          <div className="empty__icon"><IconLayers /></div>
          <div className="empty__title">Ainda não há projetos</div>
          <div>Cria o primeiro acima para começar o fluxo.</div>
        </div>
      ) : (
        <div className="grid-cards">
          {projects.map((p) => {
            const phase = PHASES.find((ph) => ph.id === p.currentPhase);
            const pct = Math.round(((p.currentPhase - 1) / 3) * 100);
            return (
              <Link to={`/projects/${p.id}`} key={p.id} className="panel project-card">
                <div className="spread">
                  <span className="pc-title wrap-text">{p.name}</span>
                  <button className="btn btn--ghost btn--icon" title="Eliminar"
                    onClick={(e) => remove(e, p.id)}><IconTrash size={16} /></button>
                </div>
                <div className="pc-meta">
                  {p.clientName || 'Sem cliente'} · {p.researchCount} {p.researchCount === 1 ? 'item' : 'itens'} de research
                </div>
                <div>
                  <div className="progress__label">
                    <span>Fase {p.currentPhase} · {phase?.label}</span><span>{pct}%</span>
                  </div>
                  <div className="progress"><div className="progress__fill" style={{ width: `${pct}%` }} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
