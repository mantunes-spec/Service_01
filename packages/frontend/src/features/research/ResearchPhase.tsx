import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';

const TYPES = [
  { value: 'document', label: 'Documento' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'note', label: 'Nota' },
];

/**
 * Fase 2 — Repositório de research. Duas fontes: ficheiro e texto colado.
 * A nomenclatura (citationKey) e os metadados são a base do sourcing posterior.
 */
export function ResearchPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const [mode, setMode] = useState<'text' | 'file'>('file');
  const [error, setError] = useState<string | null>(null);

  // Campos partilhados
  const [type, setType] = useState('document');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setTitle(''); setTags(''); setAuthor(''); setContent(''); setFile(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (mode === 'text') {
        if (!title.trim() || !content.trim()) throw new Error('Título e conteúdo obrigatórios');
        await api.addResearchText(project.id, { type, title, content, tags: tagList, author });
      } else {
        if (!file) throw new Error('Escolhe um ficheiro');
        const form = new FormData();
        form.append('file', file);
        form.append('title', title || file.name);
        form.append('type', type);
        form.append('tags', tagList.join(','));
        if (author) form.append('author', author);
        if (content) form.append('content', content);
        await api.addResearchFile(project.id, form);
      }
      resetForm();
      await reload();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (itemId: string) => {
    if (!confirm('Eliminar este item de research?')) return;
    await api.deleteResearch(project.id, itemId);
    await reload();
  };

  const items = project.researchItems;

  return (
    <>
      <h2>2 · Repositório de research</h2>
      <p className="muted">
        O material que alimenta todo o trabalho. Cada item recebe uma referência estável
        (ex.: <span className="badge key">R001</span>) para sourcing fiel na análise.
      </p>
      {error && <div className="error">{error}</div>}

      <div className="panel">
        <div className="row" style={{ marginBottom: '0.8rem' }}>
          <button className={mode === 'file' ? 'primary small' : 'small'} onClick={() => setMode('file')} type="button">Carregar ficheiro</button>
          <button className={mode === 'text' ? 'primary small' : 'small'} onClick={() => setMode('text')} type="button">Colar texto</button>
        </div>

        <form onSubmit={submit}>
          <div className="grid2">
            <div className="field">
              <label>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'file' ? 'Opcional (usa o nome do ficheiro)' : 'ex.: Entrevista ao balcão'} />
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label>Tags (separadas por vírgula)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex.: onboarding, dores" />
            </div>
            <div className="field">
              <label>Proveniência / autor</label>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="ex.: técnico X, relatório Y" />
            </div>
          </div>

          {mode === 'file' ? (
            <div className="field">
              <label>Ficheiro (até 25 MB)</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <label style={{ marginTop: '0.6rem' }}>Extrato/transcrição para citação (opcional)</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
            </div>
          ) : (
            <div className="field">
              <label>Conteúdo</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                placeholder="Cola aqui a nota, transcrição ou documento…" />
            </div>
          )}

          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'A adicionar…' : 'Adicionar ao repositório'}
          </button>
        </form>
      </div>

      <div className="spread">
        <h3>Material ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <div className="empty">Repositório vazio. Adiciona o primeiro material acima.</div>
      ) : (
        <div className="stack">
          {items.map((it) => (
            <div className="card" key={it.id}>
              <div className="spread">
                <div>
                  <span className="badge key">{it.citationKey}</span>{' '}
                  <strong>{it.title}</strong>{' '}
                  <span className="muted">· {it.type} · {it.sourceKind === 'file' ? 'ficheiro' : 'texto'}</span>
                </div>
                <div className="row">
                  {it.fileRef && (
                    <a href={api.fileUrl(project.id, it.id)} target="_blank" rel="noreferrer">
                      <button className="small" type="button">Abrir ficheiro</button>
                    </a>
                  )}
                  <button className="small danger" onClick={() => remove(it.id)} type="button">Eliminar</button>
                </div>
              </div>
              {it.author && <div className="muted" style={{ fontSize: '0.85rem' }}>Proveniência: {it.author}</div>}
              {it.content && <p className="muted" style={{ marginTop: '0.4rem' }}>{it.content.slice(0, 220)}{it.content.length > 220 ? '…' : ''}</p>}
              {it.tags.length > 0 && (
                <div className="chiplist" style={{ marginTop: '0.4rem' }}>
                  {it.tags.map((t) => <span className="chip" key={t}>{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
