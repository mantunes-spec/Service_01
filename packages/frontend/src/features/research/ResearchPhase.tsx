import { useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ResearchItem } from 'shared';
import type { ProjectContext } from '../../pages/ProjectLayout';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { PhaseFooter } from '../../components/PhaseFooter';
import {
  IconDownload, IconFile, IconFolder, IconMic, IconSearch, IconText, IconTrash, IconUpload,
} from '../../components/icons';

const TYPES = [
  { value: 'document', label: 'Documento' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'note', label: 'Nota' },
];
const typeIcon = (t: string) =>
  t === 'interview' ? <IconMic size={16} /> : t === 'note' ? <IconText size={16} /> : <IconFile size={16} />;

export function ResearchPhase() {
  const { project, reload } = useOutletContext<ProjectContext>();
  const toast = useToast();
  const [mode, setMode] = useState<'file' | 'text'>('file');

  const [type, setType] = useState('document');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const reset = () => { setTitle(''); setTags(''); setAuthor(''); setContent(''); setFile(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      reset();
      toast.ok('Adicionado ao repositório');
      await reload();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (itemId: string) => {
    if (!confirm('Eliminar este item de research?')) return;
    await api.deleteResearch(project.id, itemId);
    toast.ok('Item eliminado');
    await reload();
  };

  const items = project.researchItems;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== 'all' && it.type !== filter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.citationKey.toLowerCase().includes(q) ||
        (it.content ?? '').toLowerCase().includes(q) ||
        it.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, filter]);

  return (
    <>
      {/* Formulário de adição */}
      <div className="panel">
        <div className="panel__title"><IconUpload size={17} /><h3>Adicionar material</h3></div>
        <div className="segmented" style={{ marginBottom: '1rem' }}>
          <button className={mode === 'file' ? 'is-on' : ''} onClick={() => setMode('file')} type="button">Carregar ficheiro</button>
          <button className={mode === 'text' ? 'is-on' : ''} onClick={() => setMode('text')} type="button">Colar texto</button>
        </div>

        <form onSubmit={submit}>
          <div className="grid2">
            <div className="field">
              <label className="field__label">Tipo</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Título</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'file' ? 'Opcional (usa o nome do ficheiro)' : 'ex.: Entrevista ao balcão'} />
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label className="field__label">Tags <span className="faint">(separadas por vírgula)</span></label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex.: onboarding, dores" />
            </div>
            <div className="field">
              <label className="field__label">Proveniência / autor</label>
              <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="ex.: técnico X, relatório Y" />
            </div>
          </div>

          {mode === 'file' ? (
            <>
              <div className={`dropzone${drag ? ' is-drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files?.[0] ?? null); }}>
                <div style={{ display: 'grid', placeItems: 'center', gap: '0.4rem' }}>
                  <IconUpload />
                  {file ? <strong>{file.name}</strong> : <span>Arrasta um ficheiro para aqui, ou clica para escolher</span>}
                  <small className="faint">Até 25 MB</small>
                </div>
                <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="field mt-1">
                <label className="field__label">Extrato / transcrição para citação <span className="faint">(opcional)</span></label>
                <textarea className="textarea" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
              </div>
            </>
          ) : (
            <div className="field">
              <label className="field__label">Conteúdo</label>
              <textarea className="textarea" value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                placeholder="Cola aqui a nota, transcrição ou documento…" />
            </div>
          )}

          <button className="btn btn--primary" type="submit" disabled={busy} style={{ marginTop: '0.4rem' }}>
            {busy ? 'A adicionar…' : 'Adicionar ao repositório'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="section-title">Material · {items.length}</div>

      {items.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <IconSearch />
            <input className="input" placeholder="Procurar por título, ref, conteúdo ou tag…"
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="segmented">
            <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>Todos</button>
            {TYPES.map((t) => (
              <button key={t.value} className={filter === t.value ? 'is-on' : ''} onClick={() => setFilter(t.value)}>{t.label}</button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty__icon"><IconFolder /></div>
          <div className="empty__title">Repositório vazio</div>
          <div>Adiciona o primeiro material acima — é o que a análise vai citar.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty"><div className="empty__title">Sem resultados</div><div>Ajusta a pesquisa ou o filtro.</div></div>
      ) : (
        <div className="stack">
          {filtered.map((it: ResearchItem) => (
            <div className="card" key={it.id}>
              <div className="card__head">
                <div className="flex-1">
                  <div className="cluster" style={{ gap: '0.5rem' }}>
                    <span className="pill pill--key">{it.citationKey}</span>
                    <span className="row" style={{ gap: '0.3rem', color: 'var(--c-muted)' }}>{typeIcon(it.type)}</span>
                    <strong className="wrap-text">{it.title}</strong>
                    <span className="pill pill--muted">{it.sourceKind === 'file' ? 'ficheiro' : 'texto'}</span>
                  </div>
                  {it.author && <div className="muted" style={{ fontSize: '0.83rem', marginTop: '0.3rem' }}>Proveniência: {it.author}</div>}
                  {it.content && <p className="muted wrap-text" style={{ marginTop: '0.4rem' }}>{it.content.slice(0, 240)}{it.content.length > 240 ? '…' : ''}</p>}
                  {it.tags.length > 0 && (
                    <div className="chips" style={{ marginTop: '0.5rem' }}>
                      {it.tags.map((t) => <span className="chip chip--tag" key={t}>{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="row">
                  {it.fileRef && (
                    <a href={api.fileUrl(project.id, it.id)} target="_blank" rel="noreferrer" className="btn btn--ghost btn--icon" title="Abrir ficheiro"><IconDownload size={16} /></a>
                  )}
                  <button className="btn btn--ghost btn--icon" title="Eliminar" onClick={() => remove(it.id)}><IconTrash size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PhaseFooter projectId={project.id} current="research" />
    </>
  );
}
