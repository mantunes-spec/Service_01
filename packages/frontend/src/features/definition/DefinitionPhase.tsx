import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';

/** Fase 1 — Definição: cliente, objetivos e outcomes esperados (entrada manual). */
export function DefinitionPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const d = project.definition;

  const [clientName, setClientName] = useState(d.client.name);
  const [contact, setContact] = useState(d.client.contact ?? '');
  const [notes, setNotes] = useState(d.client.notes ?? '');
  const [objectives, setObjectives] = useState(d.objectives.join('\n'));
  const [outcomes, setOutcomes] = useState(d.expectedOutcomes.join('\n'));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toList = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.saveDefinition(project.id, {
        client: { name: clientName, contact, notes },
        objectives: toList(objectives),
        expectedOutcomes: toList(outcomes),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await reload();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <form onSubmit={save}>
      <div className="spread">
        <h2>1 · Definição do projeto</h2>
        {saved && <span className="badge validated">Guardado</span>}
      </div>
      <p className="muted">Quem é o cliente, o que se quer alcançar e o que muda no mundo se correr bem.</p>
      {error && <div className="error">{error}</div>}

      <div className="panel">
        <h3>Cliente</h3>
        <div className="field">
          <label>Nome</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>Contacto</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="field">
            <label>Notas</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h3>Objetivos</h3>
          <label>Um por linha</label>
          <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={6}
            placeholder="ex.: Reduzir o tempo de espera no atendimento" />
        </div>
        <div className="panel">
          <h3>Outcomes esperados</h3>
          <label>O que muda no mundo — um por linha</label>
          <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={6}
            placeholder="ex.: Cidadãos resolvem o pedido sem se deslocar" />
        </div>
      </div>

      <button className="primary" type="submit">Guardar definição</button>
    </form>
  );
}
