
export interface Point { x: number; y: number; }

export class WarpEngine {
    private points: Point[][] = []; // 4x4 grid
    private originalPoints: Point[][] = [];
    private rows: number = 4;
    private cols: number = 4;

    constructor(w: number, h: number, x: number, y: number) {
        for (let i = 0; i < this.rows; i++) {
            this.points[i] = [];
            this.originalPoints[i] = [];
            for (let j = 0; j < this.cols; j++) {
                const px = x + (j / (this.cols - 1)) * w;
                const py = y + (i / (this.rows - 1)) * h;
                this.points[i][j] = { x: px, y: py };
                this.originalPoints[i][j] = { x: px, y: py };
            }
        }
    }

    public getPoints(): Point[][] { return this.points; }

    public movePoint(row: number, col: number, dx: number, dy: number) {
        if (this.points[row] && this.points[row][col]) {
            this.points[row][col].x += dx;
            this.points[row][col].y += dy;
        }
    }

    public renderGrid(ctx: CanvasRenderingContext2D, zoom: number) {
        ctx.strokeStyle = '#51c5ff';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        // Horizontal lines
        for (let i = 0; i < this.rows; i++) {
            ctx.moveTo(this.points[i][0].x, this.points[i][0].y);
            for (let j = 1; j < this.cols; j++) ctx.lineTo(this.points[i][j].x, this.points[i][j].y);
        }
        // Vertical lines
        for (let j = 0; j < this.cols; j++) {
            ctx.moveTo(this.points[0][j].x, this.points[0][j].y);
            for (let i = 1; i < this.rows; i++) ctx.lineTo(this.points[i][j].x, this.points[i][j].y);
        }
        ctx.stroke();

        // Control points
        const hs = 4 / zoom;
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                ctx.fillRect(this.points[i][j].x - hs/2, this.points[i][j].y - hs/2, hs, hs);
            }
        }
    }

    public deformImageData(source: ImageData, target: ImageData, canvasW: number, canvasH: number) {
        const sourceData = source.data;
        const targetData = target.data;
        targetData.fill(0);

        // Simple Bilinear Forward Mapping (for responsiveness in JS)
        // High-end would use inverse mapping per pixel
        for (let r = 0; r < this.rows - 1; r++) {
            for (let c = 0; c < this.cols - 1; c++) {
                const p00 = this.originalPoints[r][c];
                const p10 = this.originalPoints[r][c+1];
                const p01 = this.originalPoints[r+1][c];
                const p11 = this.originalPoints[r+1][c+1];

                const t00 = this.points[r][c];
                const t10 = this.points[r][c+1];
                const t01 = this.points[r+1][c];
                const t11 = this.points[r+1][c+1];

                // Iterate sub-pixels in the bounding box of the source quad
                const minX = Math.floor(Math.min(p00.x, p10.x, p01.x, p11.x));
                const maxX = Math.ceil(Math.max(p00.x, p10.x, p01.x, p11.x));
                const minY = Math.floor(Math.min(p00.y, p10.y, p01.y, p11.y));
                const maxY = Math.ceil(Math.max(p00.y, p10.y, p01.y, p11.y));

                for (let y = minY; y <= maxY; y++) {
                    for (let x = minX; x <= maxX; x++) {
                        const idx = (y * canvasW + x) * 4;
                        if (sourceData[idx + 3] === 0) continue;

                        // Normalize coords within original quad [0,1]
                        const tx = (x - p00.x) / (p10.x - p00.x);
                        const ty = (y - p00.y) / (p01.y - p00.y);
                        
                        // Bilinear interpolation for target point
                        const destX = Math.round((1-tx)*(1-ty)*t00.x + tx*(1-ty)*t10.x + (1-tx)*ty*t01.x + tx*ty*t11.x);
                        const destY = Math.round((1-tx)*(1-ty)*t00.y + tx*(1-ty)*t10.y + (1-tx)*ty*t01.y + tx*ty*t11.y);

                        if (destX >= 0 && destX < canvasW && destY >= 0 && destY < canvasH) {
                            const dIdx = (destY * canvasW + destX) * 4;
                            targetData[dIdx] = sourceData[idx];
                            targetData[dIdx+1] = sourceData[idx+1];
                            targetData[dIdx+2] = sourceData[idx+2];
                            targetData[dIdx+3] = sourceData[idx+3];
                        }
                    }
                }
            }
        }
    }
}
