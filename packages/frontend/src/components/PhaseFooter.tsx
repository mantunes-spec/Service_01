import { Link } from 'react-router-dom';
import { IconArrowLeft, IconArrowRight } from './icons';

const ORDER = [
  { key: 'definition', label: 'Definição' },
  { key: 'research', label: 'Research' },
  { key: 'analysis', label: 'Análise' },
  { key: 'blueprints', label: 'Blueprints' },
];

/** Navegação sequencial entre fases (fluxo guiado). */
export function PhaseFooter({ projectId, current }: { projectId: string; current: string }) {
  const idx = ORDER.findIndex((o) => o.key === current);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;

  return (
    <div className="spread" style={{ marginTop: '2rem', borderTop: '1px solid var(--c-line)', paddingTop: '1.2rem' }}>
      {prev ? (
        <Link className="btn btn--ghost" to={`/projects/${projectId}/${prev.key}`}>
          <IconArrowLeft size={15} /> {prev.label}
        </Link>
      ) : <span />}
      {next ? (
        <Link className="btn btn--primary" to={`/projects/${projectId}/${next.key}`}>
          Continuar para {next.label} <IconArrowRight size={15} />
        </Link>
      ) : <span />}
    </div>
  );
}
