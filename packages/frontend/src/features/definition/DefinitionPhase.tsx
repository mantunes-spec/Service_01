import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { PhaseFooter } from '../../components/PhaseFooter';
import { IconPlus, IconTarget, IconCompass } from '../../components/icons';

/** Editor de lista por chips: adicionar com Enter, remover com ×. */
function ListEditor({
  items, onChange, placeholder,
}: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="row" style={{ marginBottom: items.length ? '0.7rem' : 0 }}>
        <input
          className="input" value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" className="btn btn--subtle" onClick={add}><IconPlus size={15} /></button>
      </div>
      {items.length > 0 && (
        <div className="stack-sm">
          {items.map((it, i) => (
            <div key={i} className="card" style={{ padding: '0.55rem 0.8rem' }}>
              <div className="spread">
                <span className="wrap-text">{it}</span>
                <button type="button" className="btn btn--ghost btn--sm"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DefinitionPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const d = project.definition;
  const toast = useToast();

  const [clientName, setClientName] = useState(d.client.name);
  const [contact, setContact] = useState(d.client.contact ?? '');
  const [notes, setNotes] = useState(d.client.notes ?? '');
  const [objectives, setObjectives] = useState<string[]>(d.objectives);
  const [outcomes, setOutcomes] = useState<string[]>(d.expectedOutcomes);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveDefinition(project.id, {
        client: { name: clientName, contact, notes },
        objectives, expectedOutcomes: outcomes,
      });
      toast.ok('Definição guardada');
      await reload();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <div className="panel">
        <div className="panel__title"><IconCompass size={17} /><h3>Cliente</h3></div>
        <div className="field">
          <label className="field__label">Nome</label>
          <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)}
            placeholder="ex.: Câmara Municipal de…" />
        </div>
        <div className="grid2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field__label">Contacto</label>
            <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field__label">Notas</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid2 mt-1">
        <div className="panel">
          <div className="panel__title"><IconTarget size={17} /><h3>Objetivos</h3></div>
          <p className="muted" style={{ marginBottom: '0.8rem', fontSize: '0.86rem' }}>O que o projeto se propõe alcançar.</p>
          <ListEditor items={objectives} onChange={setObjectives} placeholder="Adicionar objetivo e Enter" />
        </div>
        <div className="panel">
          <div className="panel__title"><IconTarget size={17} /><h3>Outcomes esperados</h3></div>
          <p className="muted" style={{ marginBottom: '0.8rem', fontSize: '0.86rem' }}>O que muda no mundo se correr bem.</p>
          <ListEditor items={outcomes} onChange={setOutcomes} placeholder="Adicionar outcome e Enter" />
        </div>
      </div>

      <div className="row mt-2">
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'A guardar…' : 'Guardar definição'}
        </button>
      </div>

      <PhaseFooter projectId={project.id} current="definition" />
    </form>
  );
}
