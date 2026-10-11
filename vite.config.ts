import fs from 'node:fs';
import path from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, Plugin } from 'vite';

function cardEditorPlugin(): Plugin {
    return {
        name: 'card-editor-api',
        configureServer(server) {
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {

                const urlPath = req.url?.split('?')[0];

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
                            const { url } = JSON.parse(body);
                            const filePath = path.resolve(process.cwd(), 'public', url.startsWith('/') ? url.slice(1) : url);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true }));
                            } else {
                                throw new Error('File not found');
                            }
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                // ─── API: Upload Media File ───────────────────────────────
                if (urlPath === '/api/upload-media' && req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    req.on('data', chunk => chunks.push(chunk));
                    req.on('end', () => {
                        try {
                            const buffer = Buffer.concat(chunks);
                            const boundaryStr = req.headers['content-type']?.split('boundary=')[1];
                            if (!boundaryStr) throw new Error('No boundary found');
                            const boundary = Buffer.from('--' + boundaryStr);

                            let startIdx = buffer.indexOf(boundary);
                            const savedFiles: string[] = [];

                            while (startIdx !== -1) {
                                startIdx += boundary.length;
                                const nextBoundary = buffer.indexOf(boundary, startIdx);
                                if (nextBoundary === -1) break;

                                const partBuffer = buffer.subarray(startIdx, nextBoundary);
                                const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
                                if (headerEnd === -1) continue;

                                const fileData = partBuffer.subarray(headerEnd + 4, partBuffer.length - 2); // Exclude trailing \r\n
                                const headerStr = partBuffer.subarray(0, headerEnd).toString();
                                const filenameMatch = headerStr.match(/filename="(.+?)"/);

                                if (filenameMatch && fileData.length > 0) {
                                    const filename = filenameMatch[1].replace(/[^a-zA-Z0-9.\-_]/g, '_');
                                    const outPath = path.resolve(process.cwd(), `public/cards/${filename}`);
                                    fs.writeFileSync(outPath, fileData);
                                    savedFiles.push(`/cards/${filename}`);
                                }

                                startIdx = nextBoundary;
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, urls: savedFiles }));
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
                                const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
                                const rawStr = fullBuffer.toString('binary');
                                const filenameMatch = rawStr.match(/filename="([^"]+)"/);
                                const origName = filenameMatch ? filenameMatch[1] : `upload_${Date.now()}.png`;
                                const safeName = path.basename(origName).replace(/[^a-zA-Z0-9._-]/g, '_');

                                // Localiza cabeçalho do multipart e o payload binário
                                const headerEnd = fullBuffer.indexOf(Buffer.from('\r\n\r\n'));
                                const boundaryBuf = Buffer.from(`\r\n--${boundary}`);
                                const payloadEnd = boundary ? fullBuffer.indexOf(boundaryBuf, headerEnd + 4) : fullBuffer.length;
                                
                                const fileData = (headerEnd !== -1 && payloadEnd !== -1 && payloadEnd > headerEnd + 4)
                                    ? fullBuffer.slice(headerEnd + 4, payloadEnd)
                                    : fullBuffer;

                                const filePath = path.join(dir, safeName);
                                fs.writeFileSync(filePath, fileData);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, url: `/cards/${safeName}`, urls: [`/cards/${safeName}`] }));
                                return;
                            }

                            // Fallback genérico
                            const fallbackName = `media_${Date.now()}.png`;
                            fs.writeFileSync(path.join(dir, fallbackName), fullBuffer);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, url: `/cards/${fallbackName}`, urls: [`/cards/${fallbackName}`] }));
                        } catch (err: unknown) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
                        }
                    });
                    return;
                }

                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [cardEditorPlugin()],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                hub: path.resolve(__dirname, 'hub.html'),
                editor: path.resolve(__dirname, 'editor.html'),
                battle: path.resolve(__dirname, 'battle.html'),
                arsenal: path.resolve(__dirname, 'arsenal.html'),
                store: path.resolve(__dirname, 'store.html'),
                forge: path.resolve(__dirname, 'forge.html'),
            }
        }
    }
});
