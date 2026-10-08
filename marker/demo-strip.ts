import type { Raster } from "./bubbles";

const W = 720;
const H = 2860;

function spikyOval(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const spike = 1 + 0.05 * Math.sin(t * 11);
    const x = cx + Math.cos(t) * rx * spike;
    const y = cy + Math.sin(t) * ry * spike;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#0b0b0b";
  ctx.fill();
}

function speedLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number) {
  ctx.save();
  ctx.strokeStyle = "#d5d3cc";
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 30);
    ctx.lineTo(cx + Math.cos(a) * 520, cy + Math.sin(a) * 420);
    ctx.stroke();
  }
  ctx.restore();
}

function hood(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#8e939c";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.quadraticCurveTo(40, -30, 80, 24);
  ctx.lineTo(70, 90);
  ctx.quadraticCurveTo(40, 70, 10, 92);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c9ccd2";
  ctx.fillRect(28, 36, 24, 18);
  ctx.fillStyle = "#5e6570";
  ctx.fillRect(18, 88, 46, 54);
  ctx.restore();
}

function crane(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#3e5f73";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(70, 0);
  ctx.lineTo(24, 28);
  ctx.lineTo(80, 46);
  ctx.lineTo(10, 36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function impactMark(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(360, 360);
  ctx.shadowColor = "#d24a3a";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#f4f1ea";
  ctx.strokeStyle = "#e15a48";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-150, -40);
  ctx.lineTo(-20, -20);
  ctx.lineTo(10, -160);
  ctx.lineTo(50, -10);
  ctx.lineTo(170, 20);
  ctx.lineTo(30, 40);
  ctx.lineTo(20, 150);
  ctx.lineTo(-30, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function bang(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const pts: Array<[number, number]> = [
    [-70, -36],
    [-40, -58],
    [0, -40],
    [46, -62],
    [78, -28],
    [50, 0],
    [74, 36],
    [10, 48],
    [-36, 58],
    [-78, 24],
    [-48, 0],
  ];
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = "#f7f6f2";
  ctx.fill();
  ctx.strokeStyle = "#1c1b19";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#1c1b19";
  ctx.font = "700 54px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!!", 0, 2);
  ctx.restore();
}

function paperBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fbfaf7";
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#161616";
  ctx.stroke();
}

export async function drawDemoStrip(): Promise<Raster> {
  await document.fonts.load("600 42px 'IBM Plex Sans KR'");
  await document.fonts.load("700 54px 'IBM Plex Sans'");
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.fillStyle = "#f6f5f1";
  ctx.fillRect(0, 0, W, H);

  speedLines(ctx, 360, 340, 36);
  impactMark(ctx);
  hood(ctx, 470, 520, 1.15);

  ctx.fillStyle = "#efece6";
  ctx.fillRect(0, 760, W, 36);

  bang(ctx, 360, 900);
  speedLines(ctx, 360, 1180, 28);
  spikyOval(ctx, 360, 1160, 168, 108);
  ctx.fillStyle = "#f7f7f5";
  ctx.font = "600 46px 'IBM Plex Sans KR', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("이게 뭐야", 360, 1160);
  hood(ctx, 80, 1280, 0.7);
  crane(ctx, 540, 1320);

  ctx.fillStyle = "#efece6";
  ctx.fillRect(0, 1540, W, 36);

  ctx.fillStyle = "#f3f1ec";
  ctx.fillRect(0, 1576, W, 704);
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = "#ddd9d0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 1620 + i * 28);
    ctx.lineTo(680, 1660 + i * 22);
    ctx.stroke();
  }
  crane(ctx, 420, 1760);
  hood(ctx, 300, 1860, 1.4);
  spikyOval(ctx, 210, 1980, 150, 112);
  ctx.fillStyle = "#f7f7f5";
  ctx.font = "600 36px 'IBM Plex Sans KR', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("숨이 막혀", 210, 1964);
  ctx.fillText("이건 내 힘", 210, 2012);

  ctx.fillStyle = "#efece6";
  ctx.fillRect(0, 2280, W, 36);
  ctx.fillStyle = "#f7f6f2";
  ctx.fillRect(0, 2316, W, H - 2316);
  paperBubble(ctx, 360, 2580, 210, 130);
  ctx.fillStyle = "#161616";
  ctx.font = "600 40px 'IBM Plex Sans KR', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("배가 부서졌어", 360, 2552);
  ctx.fillText("이건 뭐지", 360, 2610);

  const data = ctx.getImageData(0, 0, W, H);
  return { width: W, height: H, data: data.data };
}

export const DEMO_SIZE = { width: W, height: H };
