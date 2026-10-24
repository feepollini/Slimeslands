import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const MIME_TO_EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
};

const EXT_TO_MIME: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
};

function resolveCategoryDiskTarget(category: string): { absDir: string; urlPrefix: string } {
    const cleanCat = (category || 'engine').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'engine';
    if (cleanCat === 'cards' || cleanCat === 'mobbys' || cleanCat === 'packs') {
        const absDir = path.resolve(process.cwd(), 'public/cards');
        if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
        return { absDir, urlPrefix: '/cards' };
    }
    if (cleanCat === 'sounds' || cleanCat === 'audio_global') {
        const absDir = path.resolve(process.cwd(), 'public/sounds');
        if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
        return { absDir, urlPrefix: '/sounds' };
    }
    const absDir = path.resolve(process.cwd(), 'public/assets/engine', cleanCat);
    if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });
    return { absDir, urlPrefix: `/assets/engine/${cleanCat}` };
}

function writeBufferToDiskDeduped(
    buffer: Buffer,
    origName: string,
    category: string,
    forcedExt?: string
): string {
    const { absDir, urlPrefix } = resolveCategoryDiskTarget(category);
    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12);
    const parsed = path.parse(origName || 'asset');
    const cleanStem = (parsed.name || 'asset')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48) || 'asset';
    const rawExt = (forcedExt || parsed.ext.replace('.', '') || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ext = rawExt || 'png';
    const fileName = `${cleanStem}_${hash}.${ext}`;
    const fullPath = path.join(absDir, fileName);
    if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, buffer);
    }
    return `${urlPrefix}/${fileName}`;
}

function dehydrateDataUrlString(
    dataUrl: string,
    nameHint: string,
    defaultCategory: string
): string {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return dataUrl;
    }
    // Keep tiny inline utf8 SVGs (< 2KB) as-is if not base64
    if (dataUrl.startsWith('data:image/svg+xml;utf8,') && dataUrl.length < 2048) {
        return dataUrl;
    }
    const base64Idx = dataUrl.indexOf(';base64,');
    if (base64Idx === -1) return dataUrl;

    const mime = dataUrl.slice(5, base64Idx).toLowerCase();
    const base64Payload = dataUrl.slice(base64Idx + 8);
    if (!base64Payload || base64Payload.length < 64) return dataUrl;

    const ext = MIME_TO_EXT[mime] || (mime.startsWith('video/') ? 'mp4' : mime.startsWith('audio/') ? 'mp3' : 'png');
    let cat = defaultCategory;
    if (cat !== 'cards') {
        if (mime.startsWith('video/')) cat = 'video';
        else if (mime.startsWith('audio/')) cat = 'audio';
    }
    const buffer = Buffer.from(base64Payload, 'base64');
    return writeBufferToDiskDeduped(buffer, nameHint, cat, ext);
}

/**
 * Recursively traverses any JSON payload and replaces embedded Base64 data: URLs
 * with real files on disk under public/cards/ or public/assets/engine/<category>/.
 */
function dehydrateBase64AssetsToDisk<T>(
    node: T,
    defaultCategory: string = 'engine',
    keyHint: string = 'asset'
): { cleaned: T; dehydratedCount: number } {
    let dehydratedCount = 0;

    function walk(current: any, hint: string): any {
        if (!current) return current;
        if (typeof current === 'string') {
            if (current.startsWith('data:') && current.includes(';base64,')) {
                const diskUrl = dehydrateDataUrlString(current, hint, defaultCategory);
                if (diskUrl !== current) dehydratedCount++;
                return diskUrl;
            }
            return current;
        }
        if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
                current[i] = walk(current[i], `${hint}_${i}`);
            }
            return current;
        }
        if (typeof current === 'object') {
            const nameCandidate =
                current.title || current.name || current.id || hint;
            for (const k of Object.keys(current)) {
                const v = current[k];
                if (typeof v === 'string' && v.startsWith('data:') && v.includes(';base64,')) {
                    let subCat = defaultCategory;
                    const lk = k.toLowerCase();
                    if (defaultCategory !== 'cards') {
                        if (lk.includes('audio') || lk.includes('bgm') || lk.includes('sfx')) subCat = 'audio';
                        else if (lk.includes('video')) subCat = 'video';
                        else if (lk.includes('tile') || lk.includes('biome')) subCat = 'biomes';
                        else if (lk.includes('avatar') || lk.includes('character')) subCat = 'characters';
                    }
                    const diskUrl = dehydrateDataUrlString(v, `${nameCandidate}_${k}`, subCat);
                    if (diskUrl !== v) dehydratedCount++;
                    current[k] = diskUrl;
                } else if (v && typeof v === 'object') {
                    current[k] = walk(v, `${nameCandidate}_${k}`);
                }
            }
            return current;
        }
        return current;
    }

    const cleaned = walk(node, keyHint);
    return { cleaned, dehydratedCount };
}

function cardEditorPlugin(): Plugin {
    return {
        name: 'card-editor-api',
        configureServer(server) {
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {

                const rawUrl = req.url || '';
                const urlPath = rawUrl.split('?')[0];
                const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
                const searchParams = new URLSearchParams(queryString);

                // ─── Entrega Imediata de Arquivos de /cards/ e /assets/engine/ do Disco ───
                if ((urlPath?.startsWith('/cards/') || urlPath?.startsWith('/assets/engine/')) && req.method === 'GET') {
                    const relPublic = decodeURIComponent(urlPath.replace(/^\/+/, ''));
                    const filePath = path.resolve(process.cwd(), 'public', relPublic);
                    const publicRoot = path.resolve(process.cwd(), 'public');
                    if (filePath.startsWith(publicRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        res.setHeader('Content-Type', EXT_TO_MIME[ext] || 'application/octet-stream');
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

                // ─── API: Universal Engine Asset Upload (Binary Multipart or JSON Base64) ───
                if (urlPath === '/api/upload-engine-asset' && req.method === 'POST') {
                    const contentType = req.headers['content-type'] || '';
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const fullBuffer = Buffer.concat(chunks);
                            const queryCat = searchParams.get('category') || 'engine';

                            if (contentType.includes('application/json')) {
                                const payload = JSON.parse(fullBuffer.toString('utf8'));
                                const name = payload.name || `asset_${Date.now()}.png`;
                                const category = payload.category || queryCat;
                                const data = payload.data || '';
                                if (!data) throw new Error('Missing asset data');

                                const diskUrl = dehydrateDataUrlString(data, name, category);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: diskUrl, urls: [diskUrl] }));
                                return;
                            }

                            if (contentType.includes('multipart/form-data')) {
                                const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
                                const boundaryToken = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : '';
                                const boundaryBuf = Buffer.from('--' + boundaryToken);
                                const savedUrls: string[] = [];
                                let detectedCategory = queryCat;

                                if (boundaryToken) {
                                    let cur = fullBuffer.indexOf(boundaryBuf);
                                    while (cur !== -1) {
                                        const next = fullBuffer.indexOf(boundaryBuf, cur + boundaryBuf.length);
                                        if (next === -1) break;

                                        const part = fullBuffer.subarray(cur + boundaryBuf.length, next);
                                        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
                                        if (headerEnd !== -1) {
                                            const headerText = part.subarray(0, headerEnd).toString('utf8');
                                            let endPos = part.length;
                                            if (part[endPos - 1] === 0x0a) endPos--;
                                            if (part[endPos - 1] === 0x0d) endPos--;
                                            const bodyBytes = part.subarray(headerEnd + 4, endPos);

                                            const fnMatch = headerText.match(/filename="([^"]+)"/i);
                                            const fieldMatch = headerText.match(/name="([^"]+)"/i);
                                            if (!fnMatch && fieldMatch && fieldMatch[1] === 'category') {
                                                const catVal = bodyBytes.toString('utf8').trim();
                                                if (catVal) detectedCategory = catVal;
                                            } else if (fnMatch && bodyBytes.length > 0) {
                                                const origName = fnMatch[1];
                                                const savedUrl = writeBufferToDiskDeduped(bodyBytes, origName, detectedCategory);
                                                savedUrls.push(savedUrl);
                                            }
                                        }
                                        cur = next;
                                    }
                                }

                                if (savedUrls.length === 0 && fullBuffer.length > 0) {
                                    const savedUrl = writeBufferToDiskDeduped(fullBuffer, `upload_${Date.now()}.png`, detectedCategory);
                                    savedUrls.push(savedUrl);
                                }

                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: savedUrls[0] || '', urls: savedUrls }));
                                return;
                            }

                            const fallbackUrl = writeBufferToDiskDeduped(fullBuffer, `raw_${Date.now()}.png`, queryCat);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: fallbackUrl, urls: [fallbackUrl] }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Game Matrix State (src/core/matrix_state.json) ────────
                if (urlPath === '/api/matrix-state' && req.method === 'GET') {
                    const outPath = path.resolve(process.cwd(), 'src/core/matrix_state.json');
                    try {
                        if (!fs.existsSync(outPath)) {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ exists: false, snapshot: null }));
                            return;
                        }
                        const raw = fs.readFileSync(outPath, 'utf8');
                        const parsed = JSON.parse(raw);
                        const { cleaned, dehydratedCount } = dehydrateBase64AssetsToDisk(parsed, 'cards', 'matrix_card');
                        if (dehydratedCount > 0) {
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.end(JSON.stringify({ exists: true, snapshot: cleaned }));
                    } catch (err: unknown) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                    }
                    return;
                }

                if (urlPath === '/api/matrix-state' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const bodyStr = Buffer.concat(chunks).toString('utf8');
                            const data = JSON.parse(bodyStr);
                            const { cleaned, dehydratedCount } = dehydrateBase64AssetsToDisk(data, 'cards', 'matrix_card');
                            const outPath = path.resolve(process.cwd(), 'src/core/matrix_state.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                dehydratedCount,
                                snapshot: dehydratedCount > 0 ? cleaned : undefined
                            }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Marker Dream Physical Disk Storage (src/core/engine_storage/*.json) ───
                if (urlPath === '/api/engine-storage') {
                    const storageDir = path.resolve(process.cwd(), 'src/core/engine_storage');
                    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

                    if (req.method === 'GET') {
                        const key = searchParams.get('key') || '';
                        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
                        if (!safeKey) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Missing key' }));
                            return;
                        }
                        const filePath = path.join(storageDir, `${safeKey}.json`);
                        try {
                            if (!fs.existsSync(filePath)) {
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ exists: false, data: null }));
                                return;
                            }
                            const raw = fs.readFileSync(filePath, 'utf8');
                            const parsed = JSON.parse(raw);
                            const { cleaned, dehydratedCount } = dehydrateBase64AssetsToDisk(parsed, 'phases', safeKey);
                            if (dehydratedCount > 0) {
                                fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
                            }
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                            res.end(JSON.stringify({ exists: true, data: cleaned }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                        return;
                    }

                    if (req.method === 'POST') {
                        const chunks: Buffer[] = [];
                        req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                        req.on('end', () => {
                            try {
                                const bodyStr = Buffer.concat(chunks).toString('utf8');
                                const payload = JSON.parse(bodyStr);
                                const key = (payload.key || searchParams.get('key') || '').replace(/[^a-zA-Z0-9_-]/g, '_');
                                if (!key) throw new Error('Missing storage key');
                                const { cleaned, dehydratedCount } = dehydrateBase64AssetsToDisk(payload.data, 'phases', key);
                                const filePath = path.join(storageDir, `${key}.json`);
                                fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({
                                    success: true,
                                    dehydratedCount,
                                    data: dehydratedCount > 0 ? cleaned : undefined
                                }));
                            } catch (err: unknown) {
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                            }
                        });
                        return;
                    }

                    if (req.method === 'DELETE') {
                        const key = (searchParams.get('key') || '').replace(/[^a-zA-Z0-9_-]/g, '_');
                        if (key) {
                            const filePath = path.join(storageDir, `${key}.json`);
                            if (fs.existsSync(filePath)) {
                                try { fs.unlinkSync(filePath); } catch (_) {}
                            }
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true }));
                        return;
                    }
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'cards', 'card');
                            const outPath = path.resolve(process.cwd(), 'src/core/cards.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Store Catalog ─────────────────────────────
                if (urlPath === '/api/save-store' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'packs', 'store');
                            const outPath = path.resolve(process.cwd(), 'src/core/store.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Load & Save Mobbys Database ────────────────────
                if ((urlPath === '/api/mobbys' || urlPath === '/api/load-mobbys') && req.method === 'GET') {
                    const outPath = path.resolve(process.cwd(), 'src/core/mobbys.json');
                    if (fs.existsSync(outPath)) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                        res.end(fs.readFileSync(outPath, 'utf8'));
                        return;
                    }
                }

                if (urlPath === '/api/save-mobbys' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'mobbys', 'mobby');
                            const outPath = path.resolve(process.cwd(), 'src/core/mobbys.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, data: cleaned }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Save Scenarios ──────────────────────────────────
                if (urlPath === '/api/save-scenarios' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'cards', 'scenario');
                            const outPath = path.resolve(process.cwd(), 'src/core/scenarios.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'cards', 'ability');
                            const outPath = path.resolve(process.cwd(), 'src/core/abilities.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'cards', 'skill');
                            const outPath = path.resolve(process.cwd(), 'src/core/skills.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'cards', 'asset_reg');
                            const outPath = path.resolve(process.cwd(), 'src/core/assets.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const { filename, base64 } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const diskUrl = dehydrateDataUrlString(base64, filename || 'card.png', 'cards');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: diskUrl }));
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'phases', 'scene');
                            const outPath = path.resolve(process.cwd(), 'src/core/scenes.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                            const { cleaned } = dehydrateBase64AssetsToDisk(data, 'characters', 'sprite');
                            const outPath = path.resolve(process.cwd(), 'src/core/sprites.json');
                            fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
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
                    const chunks: Buffer[] = [];
                    req.on('data', (chunk: Buffer) => { chunks.push(Buffer.from(chunk)); });
                    req.on('end', () => {
                        try {
                            const { name, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
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
                                const diskUrl = dehydrateDataUrlString(data, name, 'cards');
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: diskUrl, urls: [diskUrl] }));
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
                                                let endPos = part.length;
                                                if (part[endPos - 1] === 0x0a) endPos--;
                                                if (part[endPos - 1] === 0x0d) endPos--;

                                                const fileBytes = part.subarray(headerEnd + 4, endPos);
                                                if (fileBytes.length > 0) {
                                                    const savedUrl = writeBufferToDiskDeduped(fileBytes, origName, 'cards');
                                                    savedUrls.push(savedUrl);
                                                }
                                            }
                                        }
                                        cur = next;
                                    }
                                }

                                if (savedUrls.length === 0) {
                                    const savedUrl = writeBufferToDiskDeduped(fullBuffer, `upload_${Date.now()}.png`, 'cards');
                                    savedUrls.push(savedUrl);
                                }

                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: savedUrls[0], urls: savedUrls }));
                                return;
                            }

                            // Fallback genérico
                            const fallbackUrl = writeBufferToDiskDeduped(fullBuffer, `media_${Date.now()}.png`, 'cards');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: fallbackUrl, urls: [fallbackUrl] }));
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
                '**/src/core/engine_storage/**',
                '**/src/core/mobbys.json',
                '**/src/core/cards.json',
                '**/src/core/store.json',
                '**/src/core/scenarios.json',
                '**/public/cards/**',
                '**/public/assets/engine/**',
                '**/_galeria_backup/**',
                '**/_updates/**',
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
