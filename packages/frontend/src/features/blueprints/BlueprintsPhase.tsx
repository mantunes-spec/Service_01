import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Artefact, BlueprintContent } from 'shared';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';

/**
 * Fase 4 — Blueprints e mapas. Editor de swimlanes tradicionais
 * (fases × camadas). Estruturado para evoluir para navegação interativa depois.
 */
export function BlueprintsPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const artefacts = project.artefacts;
  const selected = artefacts.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && artefacts.length > 0) setSelectedId(artefacts[0].id);
  }, [artefacts, selectedId]);

  const create = async () => {
    if (!title.trim()) return;
    const a = await api.createArtefact(project.id, title.trim());
    setTitle('');
    await reload();
    setSelectedId(a.id);
  };

  return (
    <>
      <h2>4 · Blueprints e mapas de serviço</h2>
      <p className="muted">Swimlanes tradicionais: etapas da jornada × camadas do serviço.</p>
      {error && <div className="error">{error}</div>}

      <div className="panel">
        <div className="row wrap">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do novo blueprint" style={{ maxWidth: 340 }} />
          <button className="primary" onClick={create} type="button">Novo blueprint</button>
        </div>
        {artefacts.length > 0 && (
          <div className="row wrap" style={{ marginTop: '0.8rem' }}>
            {artefacts.map((a) => (
              <button key={a.id} type="button"
                className={a.id === selectedId ? 'primary small' : 'small'}
                onClick={() => setSelectedId(a.id)}>
                {a.title} {a.status === 'validated' ? '✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <BlueprintEditor
          key={selected.id}
          artefact={selected}
          onSaved={reload}
          onError={setError}
          projectId={project.id}
        />
      ) : (
        <div className="empty">Cria um blueprint para começar.</div>
      )}
    </>
  );
}

function BlueprintEditor({
  artefact, projectId, onSaved, onError,
}: {
  artefact: Artefact;
  projectId: string;
  onSaved: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const [content, setContent] = useState<BlueprintContent>(artefact.content);
  const [dirty, setDirty] = useState(false);

  const update = (next: BlueprintContent) => { setContent(next); setDirty(true); };

  const setCell = (laneIdx: number, stageIdx: number, value: string) => {
    const lanes = content.lanes.map((l, li) =>
      li === laneIdx ? { ...l, cells: l.cells.map((c, ci) => (ci === stageIdx ? value : c)) } : l,
    );
    update({ ...content, lanes });
  };

  const setStageName = (stageIdx: number, value: string) => {
    const stages = content.stages.map((s, i) => (i === stageIdx ? value : s));
    update({ ...content, stages });
  };

  const addStage = () => {
    const stages = [...content.stages, `Etapa ${content.stages.length + 1}`];
    const lanes = content.lanes.map((l) => ({ ...l, cells: [...l.cells, ''] }));
    update({ stages, lanes });
  };

  const removeStage = (stageIdx: number) => {
    if (content.stages.length <= 1) return;
    const stages = content.stages.filter((_, i) => i !== stageIdx);
    const lanes = content.lanes.map((l) => ({ ...l, cells: l.cells.filter((_, i) => i !== stageIdx) }));
    update({ stages, lanes });
  };

  const save = async () => {
    try {
      await api.updateArtefact(projectId, artefact.id, { content });
      setDirty(false);
      await onSaved();
    } catch (e) { onError(String(e)); }
  };

  const validate = async () => {
    try {
      if (dirty) await api.updateArtefact(projectId, artefact.id, { content });
      await api.validateArtefact(projectId, artefact.id);
      setDirty(false);
      await onSaved();
    } catch (e) { onError(String(e)); }
  };

  const remove = async () => {
    if (!confirm('Eliminar este blueprint?')) return;
    await api.deleteArtefact(projectId, artefact.id);
    await onSaved();
  };

  return (
    <div className="panel">
      <div className="spread">
        <h3 style={{ margin: 0 }}>
          {artefact.title}{' '}
          <span className={`badge ${artefact.status}`}>{artefact.status === 'validated' ? 'validado' : 'rascunho'}</span>
        </h3>
        <div className="row">
          <button className="small" onClick={addStage} type="button">+ Etapa</button>
          <button className="small primary" onClick={save} disabled={!dirty} type="button">Guardar</button>
          <button className="small" onClick={validate} type="button">Validar</button>
          <button className="small danger" onClick={remove} type="button">Eliminar</button>
        </div>
      </div>

      <div className="blueprint-scroll" style={{ marginTop: '0.8rem' }}>
        <table className="blueprint">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Camada \ Etapa</th>
              {content.stages.map((s, si) => (
                <th key={si}>
                  <div className="row">
                    <input value={s} onChange={(e) => setStageName(si, e.target.value)} />
                    <button className="ghost small" title="Remover etapa"
                      onClick={() => removeStage(si)} type="button">✕</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.lanes.map((lane, li) => (
              <tr key={lane.key}>
                <td className="lane-label">{lane.label}</td>
                {lane.cells.map((cell, ci) => (
                  <td key={ci}>
                    <textarea value={cell} onChange={(e) => setCell(li, ci, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dirty && <p className="muted" style={{ marginTop: '0.5rem' }}>Alterações por guardar.</p>}
    </div>
  );
}
