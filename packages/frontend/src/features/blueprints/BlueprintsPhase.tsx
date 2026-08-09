import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Artefact, BlueprintContent } from 'shared';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { PhaseFooter } from '../../components/PhaseFooter';
import { IconCheck, IconLayers, IconPlus, IconTrash } from '../../components/icons';

export function BlueprintsPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const artefacts = project.artefacts;
  const selected = artefacts.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && artefacts.length > 0) setSelectedId(artefacts[0].id);
  }, [artefacts, selectedId]);

  const create = async () => {
    if (!title.trim()) return;
    try {
      const a = await api.createArtefact(project.id, title.trim());
      setTitle('');
      toast.ok('Blueprint criado');
      await reload();
      setSelectedId(a.id);
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <>
      <div className="panel">
        <div className="panel__title"><IconLayers size={17} /><h3>Artefactos</h3></div>
        <div className="row">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do novo blueprint" style={{ maxWidth: 360 }}
            onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
          <button className="btn btn--primary" onClick={create} type="button"><IconPlus size={16} /> Novo</button>
        </div>
        {artefacts.length > 0 && (
          <div className="cluster" style={{ marginTop: '1rem' }}>
            {artefacts.map((a) => (
              <button key={a.id} type="button"
                className={a.id === selectedId ? 'btn btn--subtle btn--sm' : 'btn btn--ghost btn--sm'}
                onClick={() => setSelectedId(a.id)}>
                {a.title} {a.status === 'validated' && <IconCheck size={13} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <BlueprintEditor key={selected.id} artefact={selected} projectId={project.id}
          onSaved={reload} toast={toast} />
      ) : (
        <div className="empty mt-2">
          <div className="empty__icon"><IconLayers /></div>
          <div className="empty__title">Nenhum blueprint ainda</div>
          <div>Cria o primeiro acima para desenhar o serviço em swimlanes.</div>
        </div>
      )}

      <PhaseFooter projectId={project.id} current="blueprints" />
    </>
  );
}

function BlueprintEditor({
  artefact, projectId, onSaved, toast,
}: {
  artefact: Artefact; projectId: string; onSaved: () => Promise<void>;
  toast: { ok: (m: string) => void; error: (m: string) => void };
}) {
  const [content, setContent] = useState<BlueprintContent>(artefact.content);
  const [dirty, setDirty] = useState(false);

  const update = (next: BlueprintContent) => { setContent(next); setDirty(true); };

  const setCell = (li: number, ci: number, v: string) =>
    update({ ...content, lanes: content.lanes.map((l, i) => i === li ? { ...l, cells: l.cells.map((c, j) => j === ci ? v : c) } : l) });
  const setStage = (ci: number, v: string) =>
    update({ ...content, stages: content.stages.map((s, i) => i === ci ? v : s) });
  const addStage = () =>
    update({ stages: [...content.stages, `Etapa ${content.stages.length + 1}`], lanes: content.lanes.map((l) => ({ ...l, cells: [...l.cells, ''] })) });
  const removeStage = (ci: number) => {
    if (content.stages.length <= 1) return;
    update({ stages: content.stages.filter((_, i) => i !== ci), lanes: content.lanes.map((l) => ({ ...l, cells: l.cells.filter((_, i) => i !== ci) })) });
  };

  const save = async () => {
    try { await api.updateArtefact(projectId, artefact.id, { content }); setDirty(false); toast.ok('Blueprint guardado'); await onSaved(); }
    catch (e) { toast.error(String(e)); }
  };
  const validate = async () => {
    try {
      if (dirty) await api.updateArtefact(projectId, artefact.id, { content });
      await api.validateArtefact(projectId, artefact.id); setDirty(false);
      toast.ok('Blueprint validado'); await onSaved();
    } catch (e) { toast.error(String(e)); }
  };
  const remove = async () => {
    if (!confirm('Eliminar este blueprint?')) return;
    await api.deleteArtefact(projectId, artefact.id); toast.ok('Blueprint eliminado'); await onSaved();
  };

  return (
    <div className="panel mt-1">
      <div className="spread" style={{ marginBottom: '1rem' }}>
        <div className="cluster" style={{ gap: '0.5rem' }}>
          <h3>{artefact.title}</h3>
          <span className={`pill pill--${artefact.status}`}>{artefact.status === 'validated' ? 'validado' : 'rascunho'}</span>
          {dirty && <span className="pill pill--draft">alterações por guardar</span>}
        </div>
        <div className="row">
          <button className="btn btn--sm" onClick={addStage} type="button"><IconPlus size={15} /> Etapa</button>
          <button className="btn btn--primary btn--sm" onClick={save} disabled={!dirty} type="button">Guardar</button>
          <button className="btn btn--subtle btn--sm" onClick={validate} type="button"><IconCheck size={15} /> Validar</button>
          <button className="btn btn--ghost btn--icon" onClick={remove} type="button" title="Eliminar"><IconTrash size={16} /></button>
        </div>
      </div>

      <div className="bp-scroll">
        <table className="bp">
          <thead>
            <tr>
              <th className="corner">Camada / Etapa</th>
              {content.stages.map((s, ci) => (
                <th key={ci} className="stage-head">
                  <div className="row">
                    <input className="input" value={s} onChange={(e) => setStage(ci, e.target.value)} />
                    <button className="btn btn--ghost btn--icon" title="Remover etapa" onClick={() => removeStage(ci)} type="button">✕</button>
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
                  <td key={ci} className="cell">
                    <textarea value={cell} onChange={(e) => setCell(li, ci, e.target.value)} placeholder="…" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
