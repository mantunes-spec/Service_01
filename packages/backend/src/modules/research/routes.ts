import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { mapResearchItem } from '../../db/mappers.js';

/**
 * Fase 2 — Repositório de research (knowledge management).
 *
 * Aceita duas fontes desde já: texto colado e upload de ficheiros. A
 * nomenclatura/ref (`citationKey`) e os metadados de proveniência são de
 * primeira classe, porque toda a análise a jusante faz sourcing a este material.
 */
export const researchRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/backend/storage/<projectId>/
const STORAGE_ROOT = path.resolve(__dirname, '../../../storage');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(STORAGE_ROOT, req.params.projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // Nome único no disco; o nome original preserva-se em `fileName`.
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^\w.-]+/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

/** Gera uma ref estável e sequencial por projeto: R001, R002, ... */
async function nextCitationKey(projectId: string): Promise<string> {
  const count = await prisma.researchItem.count({ where: { projectId } });
  return `R${String(count + 1).padStart(3, '0')}`;
}

const parseTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

// Criar item de TEXTO colado
const textSchema = z.object({
  type: z.enum(['note', 'interview', 'document']).default('note'),
  title: z.string().min(1, 'Título obrigatório'),
  content: z.string().min(1, 'Conteúdo obrigatório'),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  capturedAt: z.string().optional(),
});

researchRouter.post('/:projectId/research/text', async (req, res) => {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;
  const item = await prisma.researchItem.create({
    data: {
      projectId: req.params.projectId,
      citationKey: await nextCitationKey(req.params.projectId),
      type: d.type,
      title: d.title,
      sourceKind: 'pasted_text',
      content: d.content,
      tags: JSON.stringify(d.tags ?? []),
      author: d.author ?? null,
      capturedAt: d.capturedAt ? new Date(d.capturedAt) : null,
    },
  });
  res.status(201).json(mapResearchItem(item));
});

// Criar item por UPLOAD de ficheiro (multipart/form-data, campo "file")
researchRouter.post(
  '/:projectId/research/file',
  upload.single('file'),
  async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Ficheiro em falta (campo "file")' });

    const title = (req.body.title as string) || file.originalname;
    const type = (['note', 'interview', 'document'].includes(req.body.type)
      ? req.body.type
      : 'document') as string;

    const item = await prisma.researchItem.create({
      data: {
        projectId: req.params.projectId,
        citationKey: await nextCitationKey(req.params.projectId),
        type,
        title,
        sourceKind: 'file',
        content: (req.body.content as string) || null,
        fileName: file.originalname,
        fileRef: path.relative(STORAGE_ROOT, file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        tags: JSON.stringify(parseTags(req.body.tags)),
        author: (req.body.author as string) || null,
        capturedAt: req.body.capturedAt ? new Date(req.body.capturedAt) : null,
      },
    });
    res.status(201).json(mapResearchItem(item));
  },
);

// Descarregar o ficheiro de um item
researchRouter.get('/:projectId/research/:itemId/file', async (req, res) => {
  const item = await prisma.researchItem.findUnique({ where: { id: req.params.itemId } });
  if (!item || !item.fileRef) return res.status(404).json({ error: 'Ficheiro não encontrado' });
  const abs = path.join(STORAGE_ROOT, item.fileRef);
  res.download(abs, item.fileName ?? path.basename(abs));
});

// Atualizar metadados (nomenclatura/arrumação é crítica)
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['note', 'interview', 'document']).optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  content: z.string().optional(),
});

researchRouter.patch('/:projectId/research/:itemId', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const d = parsed.data;
  const item = await prisma.researchItem.update({
    where: { id: req.params.itemId },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.tags !== undefined ? { tags: JSON.stringify(d.tags) } : {}),
      ...(d.author !== undefined ? { author: d.author } : {}),
      ...(d.content !== undefined ? { content: d.content } : {}),
    },
  });
  res.json(mapResearchItem(item));
});

// Eliminar item (e o ficheiro em disco, se existir)
researchRouter.delete('/:projectId/research/:itemId', async (req, res) => {
  const item = await prisma.researchItem.findUnique({ where: { id: req.params.itemId } });
  if (item?.fileRef) {
    const abs = path.join(STORAGE_ROOT, item.fileRef);
    fs.rm(abs, { force: true }, () => {});
  }
  await prisma.researchItem.delete({ where: { id: req.params.itemId } });
  res.status(204).end();
});
