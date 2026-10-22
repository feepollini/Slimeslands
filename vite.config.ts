import fs from 'node:fs';
import path from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function cardEditorPlugin(): Plugin {
    return {
        name: 'card-editor-api',
        configureServer(server) {
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {

                const urlPath = req.url?.split('?')[0];

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

                // ─── API: Save Store Catalog ─────────────────────────────
                if (urlPath === '/api/save-store' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body);
                            const outPath = path.resolve(process.cwd(), 'src/core/store.json');
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
                                                const safeName = `${Date.now()}_${path.basename(origName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
        watch: {
            ignored: [
                '**/src/core/*.json',
                '**/src/core/mobbys.json',
                '**/src/core/cards.json',
                '**/src/core/store.json',
                '**/src/core/scenarios.json',
                '**/public/cards/**'
            ]
        }
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
