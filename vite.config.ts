import fs from 'node:fs';
import path from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { runFullCatalogGeneration } from './src/core/generateMatrixCatalog';

function cardEditorPlugin(): Plugin {
    return {
        name: 'card-editor-api',
        configureServer(server) {
            try {
                runFullCatalogGeneration(process.cwd());
            } catch (err) {
                console.warn('[MatrixEngine] Erro na geração:', err);
            }
            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {

                const urlPath = req.url?.split('?')[0];

                
                
                
                // ─── API: Fish Audio Studio Proxy ───────────────────────────
                if (urlPath?.startsWith('/api/fish-audio/')) {
                    const EMBEDDED_DEFAULT_FISH_KEY = 'sk-fish-KgdPfgQPGOoZwtPxsRTsW3nweBGZBJKpEUp23ffHrss';
                    const headerKey = req.headers['x-fish-api-key'] as string;
                    const activeApiKey = (headerKey && headerKey.length >= 8) ? headerKey.trim() : EMBEDDED_DEFAULT_FISH_KEY;

                    if (urlPath === '/api/fish-audio/config' && req.method === 'POST') {
                        const chunks: Buffer[] = [];
                        req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                        req.on('end', () => {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true, configured: true }));
                        });
                        return;
                    }

                    if (urlPath?.startsWith('/api/fish-audio/model/') && req.method === 'GET') {
                        const modelId = urlPath.replace('/api/fish-audio/model/', '').trim();
                        try {
                            const fetchRes = await fetch(`https://api.fish.audio/model/${encodeURIComponent(modelId)}`, {
                                headers: { Authorization: `Bearer ${activeApiKey}` }
                            });
                            if (!fetchRes.ok) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ ok: false }));
                                return;
                            }
                            const it = await fetchRes.json() as any;
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                ok: true,
                                voice: {
                                    id: `fish-fav-${it._id}`,
                                    referenceId: it._id,
                                    name: it.title || 'Voz Fish Audio',
                                    authorName: it.author?.nickname || 'Comunidade',
                                    coverImage: it.cover_image,
                                    sampleAudioUrl: it.samples?.[0]?.audio,
                                    taskCount: it.task_count ?? 0,
                                    likeCount: it.like_count ?? 0,
                                    accent: 'pt-BR',
                                    category: 'Favoritas',
                                    isFavorite: true,
                                    defaultSpeed: 1.0,
                                }
                            }));
                        } catch {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: false }));
                        }
                        return;
                    }

                    if (urlPath === '/api/fish-audio/models' && req.method === 'GET') {
                        try {
                            const parsedUrl = new URL(req.url || '', 'http://localhost');
                            const search = parsedUrl.searchParams.get('search') || '';
                            const sortBy = parsedUrl.searchParams.get('sort_by') || 'task_count';

                            const targetUrl = new URL('https://api.fish.audio/model');
                            targetUrl.searchParams.set('language', 'pt');
                            targetUrl.searchParams.set('page_size', '40');
                            targetUrl.searchParams.set('sort_by', sortBy);
                            if (search) targetUrl.searchParams.set('title', search);

                            const fetchRes = await fetch(targetUrl.toString(), {
                                headers: { Authorization: `Bearer ${activeApiKey}` }
                            });
                            if (!fetchRes.ok) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ liveApiAvailable: false, items: [] }));
                                return;
                            }
                            const data = await fetchRes.json() as any;
                            const items = (data.items || []).map((it: any) => ({
                                id: `fish-live-${it._id}`,
                                referenceId: it._id,
                                name: it.title || 'Voz Fish Audio',
                                authorName: it.author?.nickname || 'Comunidade',
                                coverImage: it.cover_image,
                                sampleAudioUrl: it.samples?.[0]?.audio,
                                taskCount: it.task_count ?? 0,
                                likeCount: it.like_count ?? 0,
                                accent: 'pt-BR',
                                gender: (it.tags || []).some((t: string) => t.toLowerCase().includes('female') || t.toLowerCase().includes('mulher')) ? 'F' : 'M',
                                tags: it.tags || ['Português'],
                                category: 'Populares',
                                isFavorite: false,
                                defaultSpeed: 1.0,
                            }));
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ liveApiAvailable: true, favoritesCount: 0, items }));
                        } catch (e: any) {
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ liveApiAvailable: false, items: [], error: e.message }));
                        }
                        return;
                    }

                    if (urlPath === '/api/fish-audio/tts' && req.method === 'POST') {
                        const chunks: Buffer[] = [];
                        req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                        req.on('end', async () => {
                            try {
                                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
                                const { text, reference_id, model = 's2.1-pro-free', format = 'mp3', speed = 1.0, volume = 0 } = body;

                                const payload: Record<string, unknown> = { text, format };
                                if (reference_id && !String(reference_id).startsWith('local-')) {
                                    payload.reference_id = String(reference_id).trim();
                                }
                                if (Math.abs(Number(speed) - 1.0) > 0.01 || Number(volume) !== 0) {
                                    payload.prosody = { speed: Number(speed) || 1.0, volume: Number(volume) || 0 };
                                }

                                const fishRes = await fetch('https://api.fish.audio/v1/tts', {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${activeApiKey}`,
                                        'Content-Type': 'application/json',
                                        model: String(model || 's2.1-pro-free'),
                                    },
                                    body: JSON.stringify(payload),
                                });

                                if (!fishRes.ok) {
                                    const errText = await fishRes.text().catch(() => '');
                                    res.statusCode = 200;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ fallback: true, reason: `FISH_API_${fishRes.status}`, details: errText }));
                                    return;
                                }

                                const arrayBuf = await fishRes.arrayBuffer();
                                res.statusCode = 200;
                                res.setHeader('Content-Type', format === 'wav' ? 'audio/wav' : 'audio/mpeg');
                                res.setHeader('X-Fish-Audio-Source', 'live-api');
                                res.end(Buffer.from(arrayBuf));
                            } catch (err: any) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ fallback: true, reason: 'NETWORK_ERROR', details: err.message }));
                            }
                        });
                        return;
                    }
                }

                // ─── API: Upload Engine Asset (DiskAssetEngine) ──────────
                if (urlPath === '/api/upload-engine-asset' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                    req.on('end', () => {
                        try {
                            const fullBuf = Buffer.concat(chunks);
                            const contentType = req.headers['content-type'] || '';
                            const queryCat = req.url && req.url.includes('category=') ? decodeURIComponent(req.url.split('category=')[1].split('&')[0]) : 'misc';

                            if (contentType.includes('application/json')) {
                                const parsed = JSON.parse(fullBuf.toString('utf8') || '{}');
                                const dataUrl = parsed.data || parsed.dataUrl || '';
                                const fileNameHint = path.basename(parsed.name || parsed.fileName || 'asset').replace(/[^a-zA-Z0-9._-]/g, '_');
                                const category = parsed.category || queryCat || 'misc';
                                const targetDir = path.resolve(process.cwd(), 'public/assets/engine', category);
                                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                                if (!dataUrl.startsWith('data:')) {
                                    res.statusCode = 400;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'Invalid data URL' }));
                                    return;
                                }

                                let ext = '.png';
                                let fileBytes: Buffer;

                                if (dataUrl.includes(';base64,')) {
                                    const semiIdx = dataUrl.indexOf(';base64,');
                                    const mimeHeader = dataUrl.substring(5, semiIdx).toLowerCase();
                                    const base64Str = dataUrl.substring(semiIdx + 8).trim();
                                    if (mimeHeader.includes('png')) ext = '.png';
                                    else if (mimeHeader.includes('jpeg') || mimeHeader.includes('jpg')) ext = '.jpg';
                                    else if (mimeHeader.includes('webp')) ext = '.webp';
                                    else if (mimeHeader.includes('svg')) ext = '.svg';
                                    else if (mimeHeader.includes('gif')) ext = '.gif';
                                    else if (mimeHeader.includes('mp4') || mimeHeader.includes('webm')) ext = mimeHeader.includes('webm') ? '.webm' : '.mp4';
                                    else if (mimeHeader.includes('audio') || mimeHeader.includes('mp3') || mimeHeader.includes('wav') || mimeHeader.includes('ogg')) ext = mimeHeader.includes('wav') ? '.wav' : mimeHeader.includes('ogg') ? '.ogg' : '.mp3';

                                    fileBytes = Buffer.from(base64Str, 'base64');
                                } else if (dataUrl.startsWith('data:image/svg+xml')) {
                                    ext = '.svg';
                                    const svgText = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;?(utf8,|charset=utf-8,)?/i, ''));
                                    fileBytes = Buffer.from(svgText, 'utf8');
                                } else {
                                    const commaIdx = dataUrl.indexOf(',');
                                    if (commaIdx !== -1) {
                                        fileBytes = Buffer.from(dataUrl.substring(commaIdx + 1), 'base64');
                                    } else {
                                        res.statusCode = 400;
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify({ error: 'Unsupported data URL format' }));
                                        return;
                                    }
                                }

                                const safeName = fileNameHint.endsWith(ext) ? fileNameHint : `${fileNameHint}_${Date.now()}${ext}`;
                                fs.writeFileSync(path.join(targetDir, safeName), fileBytes);
                                const publicUrl = `/assets/engine/${category}/${safeName}`;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: publicUrl }));
                                return;
                            }

                            if (contentType.includes('multipart/form-data')) {
                                const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
                                const boundaryToken = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : '';
                                const targetDir = path.resolve(process.cwd(), 'public/assets/engine', queryCat);
                                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                                if (boundaryToken) {
                                    const boundaryBuf = Buffer.from('--' + boundaryToken);
                                    let cur = fullBuf.indexOf(boundaryBuf);
                                    let savedUrl = '';

                                    while (cur !== -1) {
                                        const next = fullBuf.indexOf(boundaryBuf, cur + boundaryBuf.length);
                                        if (next === -1) break;

                                        const part = fullBuf.subarray(cur + boundaryBuf.length, next);
                                        const headerEnd = part.indexOf(Buffer.from([0x0d, 0x0a, 0x0d, 0x0a]));
                                        if (headerEnd !== -1) {
                                            const headerText = part.subarray(0, headerEnd).toString('utf8');
                                            const fnMatch = headerText.match(/filename="([^"]+)"/i);
                                            if (fnMatch) {
                                                const origName = fnMatch[1];
                                                const ext = path.extname(origName) || '.png';
                                                const base = path.basename(origName, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
                                                const randSuffix = Math.random().toString(36).substring(2, 6);
                                                const safeName = `${base}_${Date.now()}_${randSuffix}${ext}`;
                                                let endPos = part.length;
                                                if (part[endPos - 1] === 0x0a) endPos--;
                                                if (part[endPos - 1] === 0x0d) endPos--;

                                                const fileBytes = part.subarray(headerEnd + 4, endPos);
                                                if (fileBytes.length > 0) {
                                                    fs.writeFileSync(path.join(targetDir, safeName), fileBytes);
                                                    savedUrl = `/assets/engine/${queryCat}/${safeName}`;
                                                    break;
                                                }
                                            }
                                        }
                                        cur = next;
                                    }

                                    if (savedUrl) {
                                        res.setHeader('Content-Type', 'application/json');
                                        res.end(JSON.stringify({ success: true, url: savedUrl }));
                                        return;
                                    }
                                }
                            }

                            // Raw binary fallback
                            const targetDir = path.resolve(process.cwd(), 'public/assets/engine', queryCat);
                            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                            const finalName = 'asset_' + Date.now() + '.png';
                            fs.writeFileSync(path.join(targetDir, finalName), fullBuf);
                            const publicUrl = '/assets/engine/' + queryCat + '/' + finalName;

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: publicUrl }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Engine Storage (storage.ts) ───────────────────
                if (urlPath === '/api/engine-storage') {
                    // Armazena fora de src/ para evitar que o watcher do Vite acione recarregamento de página (HMR reload)
                    const storageDir = path.resolve(process.cwd(), 'data/disk_storage');
                    const legacyStorageDir = path.resolve(process.cwd(), 'src/core/disk_storage');
                    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

                    if (req.method === 'GET') {
                        const key = req.url && req.url.includes('key=') ? decodeURIComponent(req.url.split('key=')[1].split('&')[0]) : '';
                        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
                        let file = path.join(storageDir, safeKey + '.json');
                        if (!fs.existsSync(file)) {
                            const legacyFile = path.join(legacyStorageDir, safeKey + '.json');
                            if (fs.existsSync(legacyFile)) file = legacyFile;
                        }

                        if (fs.existsSync(file)) {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(fs.readFileSync(file, 'utf8'));
                        } else {
                            res.statusCode = 404;
                            res.end(JSON.stringify({ error: 'Key not found' }));
                        }
                        return;
                    }

                    if (req.method === 'POST') {
                        const chunks: Buffer[] = [];
                        req.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                        req.on('end', () => {
                            try {
                                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
                                const key = (parsed.key || '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                if (!key) {
                                    res.statusCode = 400;
                                    res.end(JSON.stringify({ error: 'Missing storage key' }));
                                    return;
                                }
                                const file = path.join(storageDir, key + '.json');
                                fs.writeFileSync(file, JSON.stringify(parsed.data ?? null, null, 2), 'utf8');
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true }));
                            } catch (e: unknown) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Storage write error' }));
                            }
                        });
                        return;
                    }
                }

                if (urlPath === '/api/regenerate-catalog' && req.method === 'GET') {
                    try {
                        const stats = runFullCatalogGeneration(process.cwd());
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, stats }));
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                    }
                    return;
                }

                // ─── Entrega Imediata de Arquivos de /cards/ do Disco ───
                if (urlPath?.startsWith('/cards/') && req.method === 'GET') {
                    const filename = urlPath.replace('/cards/', '');
                    const filePath = path.resolve(process.cwd(), 'public/cards', decodeURIComponent(filename));
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        const mimeTypes: Record<string, string> = {
                            '.png': 'image/png',
                            '.jpg': 'image/jpeg',
                            '.jpeg': 'image/jpeg',
                            '.webp': 'image/webp',
                            '.gif': 'image/gif',
                            '.mp4': 'video/mp4',
                            '.webm': 'video/webm',
                            '.mov': 'video/quicktime'
                        };
                        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        res.end(fs.readFileSync(filePath));
                        return;
                    }
                }

                // ─── API: List Available Images ──────────────────────────
                if (urlPath === '/api/images' && req.method === 'GET') {
                    const cardsDir = path.resolve(process.cwd(), 'public/cards');
                    const bgsDir = path.resolve(process.cwd(), 'public');
                    try {
                        if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });
                        const cards = fs.readdirSync(cardsDir).filter(f => /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|m4v|ogv)$/i.test(f)).map(f => `/cards/${f}`);
                        const bgs = fs.readdirSync(bgsDir).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f)).map(f => `/${f}`);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ cards, bgs }));
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }));
                    }
                    return;
                }

                // ─── API: Load Card Database ─────────────────────────────
                if ((urlPath === '/api/cards' || urlPath === '/api/load-cards') && req.method === 'GET') {
                    const outPath = path.resolve(process.cwd(), 'src/core/cards.json');
                    if (fs.existsSync(outPath)) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.end(fs.readFileSync(outPath, 'utf8'));
                        return;
                    }
                }

                // ─── API: Save Card Database ─────────────────────────────
                if ((urlPath === '/api/save-cards' || urlPath === '/api/save-card') && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/cards.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Store Catalog & Sync to Matrix Snapshot ───
                if (urlPath === '/api/save-store' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/store.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

                            // SYNC DIRECTLY TO GAME MATRIX SNAPSHOT
                            const matrixPath = path.resolve(process.cwd(), 'src/core/matrix_snapshot.json');
                            if (fs.existsSync(matrixPath)) {
                                try {
                                    const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
                                    matrixData.packs = data.packs || data;
                                    matrixData.store = data;
                                    matrixData.updatedAt = new Date().toISOString();
                                    fs.writeFileSync(matrixPath, JSON.stringify(matrixData, null, 2), 'utf8');
                                } catch (mErr) {
                                    console.error('[save-store] Erro ao sincronizar com matrix_snapshot.json:', mErr);
                                }
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Mobbys Database ───────────────────────────
                if (urlPath === '/api/save-mobbys' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/mobbys.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Scenarios ──────────────────────────────────
                if (urlPath === '/api/save-scenarios' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/scenarios.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Rarities ──────────────────────────────────
                if (urlPath === '/api/save-rarities' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/rarities.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Abilities ──────────────────────────────────
                if (urlPath === '/api/save-abilities' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/abilities.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Skill Pool ──────────────────────────────────
                if (urlPath === '/api/save-skills' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/skills.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Assets Registry ──────────────────────────────
                if (urlPath === '/api/save-assets' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/assets.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Permanent Delete Media ───────────────────────────
                if (urlPath === '/api/delete-media' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { url, urls } = JSON.parse(body);
                            const targetUrls: string[] = Array.isArray(urls) ? urls : (url ? [url] : []);
                            const deleted: string[] = [];

                            for (const rawUrl of targetUrls) {
                                if (!rawUrl || typeof rawUrl !== 'string') continue;
                                const cleanRel = decodeURIComponent(rawUrl.split('?')[0]).replace(/^\/+/, '');
                                const filePath = path.resolve(process.cwd(), 'public', cleanRel);
                                // Prevent directory traversal outside public
                                const publicRoot = path.resolve(process.cwd(), 'public');
                                if (filePath.startsWith(publicRoot)) {
                                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                                        fs.unlinkSync(filePath);
                                    }
                                    deleted.push(rawUrl);
                                }
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, deleted }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }



                // ─── API: Save Base64 Thumbnail ───────────────────────────
                if (urlPath === '/api/save-image' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { filename, base64 } = JSON.parse(body);
                            // Extract base64 data matching the regex
                            const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                            if (!matches || matches.length !== 3) {
                                throw new Error('Invalid Base64 string');
                            }
                            const imageBuffer = Buffer.from(matches[2], 'base64');
                            const outPath = path.resolve(process.cwd(), `public/cards/${filename}`);
                            fs.writeFileSync(outPath, imageBuffer);

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: `/cards/${filename}` }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: List Available Sounds ──────────────────────────
                if (urlPath === '/api/sounds' && req.method === 'GET') {
                    const soundsDir = path.resolve(process.cwd(), 'public/sounds');
                    try {
                        if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });
                        const sounds = fs.readdirSync(soundsDir)
                            .filter(f => /\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i.test(f))
                            .map(f => `/sounds/${f}`);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ sounds }));
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }));
                    }
                    return;
                }

                // ─── API: Upload Sound File ───────────────────────────────
                if (urlPath === '/api/upload-sound' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', chunk => chunks.push(chunk));
                    req.on('end', () => {
                        try {
                            const buffer = Buffer.concat(chunks);
                            const boundaryStr = req.headers['content-type']?.split('boundary=')[1];
                            if (!boundaryStr) throw new Error('No boundary found');
                            const boundary = Buffer.from('--' + boundaryStr);
                            let startIdx = buffer.indexOf(boundary);
                            const soundsDir = path.resolve(process.cwd(), 'public/sounds');
                            if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });
                            let savedUrl = '';
                            while (startIdx !== -1) {
                                startIdx += boundary.length;
                                const nextBoundary = buffer.indexOf(boundary, startIdx);
                                if (nextBoundary === -1) break;
                                const partBuffer = buffer.subarray(startIdx, nextBoundary);
                                const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
                                if (headerEnd === -1) continue;
                                const fileData = partBuffer.subarray(headerEnd + 4, partBuffer.length - 2);
                                const headerStr = partBuffer.subarray(0, headerEnd).toString();
                                const filenameMatch = headerStr.match(/filename="(.+?)"/);
                                if (filenameMatch && fileData.length > 0) {
                                    const filename = filenameMatch[1].replace(/[^a-zA-Z0-9.\-_]/g, '_');
                                    const outPath = path.resolve(soundsDir, filename);
                                    fs.writeFileSync(outPath, fileData);
                                    savedUrl = `/sounds/${filename}`;
                                }
                                startIdx = nextBoundary;
                            }
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: savedUrl }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Sounds Config ──────────────────────────────
                if (urlPath === '/api/save-sounds' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/sounds.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Scenes ──────────────────────────────────
                if (urlPath === '/api/save-scenes' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/scenes.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Load Scenes ──────────────────────────────────
                if (urlPath === '/api/load-scenes' && req.method === 'GET') {
                    const outPath = path.resolve(process.cwd(), 'src/core/scenes.json');
                    try {
                        if (!fs.existsSync(outPath)) {
                            fs.writeFileSync(outPath, '[]', 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify([]));
                        } else {
                            const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(data));
                        }
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                    }
                    return;
                }

                // ─── API: Save Sprites (Packs + Gallery) ──────────────────
                if (urlPath === '/api/save-sprites' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/sprites.json');
                            fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Load Sprites (Packs + Gallery) ──────────────────
                if (urlPath === '/api/load-sprites' && req.method === 'GET') {
                    const outPath = path.resolve(process.cwd(), 'src/core/sprites.json');
                    try {
                        if (!fs.existsSync(outPath)) {
                            const empty = { packs: [], gallery: [] };
                            fs.writeFileSync(outPath, JSON.stringify(empty, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(empty));
                        } else {
                            const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(data));
                        }
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                    }
                    return;
                }

                // ─── API: Upload Sprite Frame ──────────────────────────
                if (urlPath === '/api/upload-sprite-frame' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { name, data } = JSON.parse(body); // data: base64 string
                            if (!name || !data) throw new Error('Missing name or data');

                            const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
                            const buffer = Buffer.from(base64Data, 'base64');
                            
                            const dir = path.resolve(process.cwd(), 'public/assets/sprites');
                            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                            
                            const filePath = path.join(dir, name);
                            fs.writeFileSync(filePath, buffer);
                            
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: `/assets/sprites/${name}` }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Upload Media (Cards, Packs, Banners, Backgrounds) ─
                if (urlPath === '/api/upload-media' && req.method === 'POST') {
                    const contentType = req.headers['content-type'] || '';
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const fullBuffer = Buffer.concat(chunks);
                            const dir = path.resolve(process.cwd(), 'public/cards');
                            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                            if (contentType.includes('application/json')) {
                                const { name, data } = JSON.parse(fullBuffer.toString('utf8'));
                                if (!name || !data) throw new Error('Missing name or data');
                                const safeName = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
                                const base64Data = data.replace(/^data:[^;]+;base64,/, "");
                                const buffer = Buffer.from(base64Data, 'base64');
                                const filePath = path.join(dir, safeName);
                                fs.writeFileSync(filePath, buffer);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: `/cards/${safeName}`, urls: [`/cards/${safeName}`] }));
                                return;
                            }

                            if (contentType.includes('multipart/form-data')) {
                                const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
                                const boundaryToken = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : '';
                                const boundaryBuf = Buffer.from('--' + boundaryToken);
                                const savedUrls: string[] = [];

                                if (boundaryToken) {
                                    let cur = fullBuffer.indexOf(boundaryBuf);
                                    while (cur !== -1) {
                                        const next = fullBuffer.indexOf(boundaryBuf, cur + boundaryBuf.length);
                                        if (next === -1) break;

                                        const part = fullBuffer.subarray(cur + boundaryBuf.length, next);
                                        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
                                        if (headerEnd !== -1) {
                                            const headerText = part.subarray(0, headerEnd).toString('utf8');
                                            const fnMatch = headerText.match(/filename="([^"]+)"/i);
                                            if (fnMatch) {
                                                const origName = fnMatch[1];
                                                const randSuffix = Math.random().toString(36).substring(2, 6);
                                                const safeName = `${Date.now()}_${randSuffix}_${path.basename(origName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                                                let endPos = part.length;
                                                if (part[endPos - 1] === 0x0a) endPos--;
                                                if (part[endPos - 1] === 0x0d) endPos--;

                                                const fileBytes = part.subarray(headerEnd + 4, endPos);
                                                if (fileBytes.length > 0) {
                                                    fs.writeFileSync(path.join(dir, safeName), fileBytes);
                                                    savedUrls.push(`/cards/${safeName}`);
                                                }
                                            }
                                        }
                                        cur = next;
                                    }
                                }

                                if (savedUrls.length === 0) {
                                    const fallbackName = `upload_${Date.now()}.png`;
                                    fs.writeFileSync(path.join(dir, fallbackName), fullBuffer);
                                    savedUrls.push(`/cards/${fallbackName}`);
                                }

                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: savedUrls[0], urls: savedUrls }));
                                return;
                            }

                            // Fallback genérico
                            const fallbackName = `media_${Date.now()}.png`;
                            fs.writeFileSync(path.join(dir, fallbackName), fullBuffer);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: `/cards/${fallbackName}`, urls: [`/cards/${fallbackName}`] }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                next();
            });

            server.httpServer?.once('listening', () => {
                process.stdin.removeAllListeners('end');
            });
        }
    };
}

export default defineConfig({
    plugins: [cardEditorPlugin(), react(), tailwindcss()],
    server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: {
            ignored: [
                '**/src/core/*.json',
                '**/src/core/mobbys.json',
                '**/src/core/cards.json',
                '**/src/core/store.json',
                '**/src/core/scenarios.json',
                '**/public/cards/**',
                '**/_galeria_backup/**',
                '**/updates/**',
                '**/.aistudio/**'
            ]
        }
    },
    optimizeDeps: {
        entries: [
            'index.html',
            'hub.html',
            'battle.html',
            'boss_battle.html',
            'arsenal.html',
            'store.html',
            'forge.html'
        ]
    },
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                hub: path.resolve(__dirname, 'hub.html'),
                battle: path.resolve(__dirname, 'battle.html'),
                boss_battle: path.resolve(__dirname, 'boss_battle.html'),
                arsenal: path.resolve(__dirname, 'arsenal.html'),
                store: path.resolve(__dirname, 'store.html'),
                forge: path.resolve(__dirname, 'forge.html')
            }
        }
    }
});
