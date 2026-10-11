// Thumbs leves p/ grids (deck/loja): /cards/X.png -> /cards/thumbs/X.png
export function thumbFor(url: string): string {
    if (typeof url !== 'string') return url;
    if (url.startsWith('/cards/') && /\.(png|jpe?g)$/i.test(url)) {
        return url.replace('/cards/', '/cards/thumbs/');
    }
    return url;
}
