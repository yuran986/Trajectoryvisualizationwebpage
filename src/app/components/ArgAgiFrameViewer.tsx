import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Eye, Play } from 'lucide-react';

interface ActionXY {
  x?: number | string | null;
  y?: number | string | null;
}

export interface ArgAgiFrameRecord {
  type: string;
  timestamp: string;
  run_id?: string;
  step: number;
  state?: string | null;
  levels_completed?: number | null;
  action?: string | null;
  action_xy?: ActionXY | null;
  frame?: unknown;
}

interface ArgAgiFrameViewerProps {
  title: string;
  records: ArgAgiFrameRecord[];
  emptyMessage?: string;
  statusBadge?: string;
}

const DEFAULT_EMPTY = 'No frame records available yet.';
const FRAME_CELL_SIZE = 5;

const PALETTE: Record<number, string> = {
  0: '#f8fafc',
  2: '#9ca3af',
  4: '#374151',
  5: '#111827',
  8: '#ef4444',
  9: '#3b82f6',
  12: '#f59e0b',
};

function colorForValue(value: number): string {
  if (value in PALETTE) {
    return PALETTE[value];
  }
  const hue = (Math.abs(value) * 47) % 360;
  return `hsl(${hue} 60% 45%)`;
}

function isNumericRow(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((cell) => typeof cell === 'number');
}

function extract2DGrid(rawFrame: unknown): number[][] | null {
  if (!Array.isArray(rawFrame) || rawFrame.length === 0) {
    return null;
  }

  if (isNumericRow(rawFrame[0])) {
    const rows = rawFrame as number[][];
    if (rows.every(isNumericRow)) {
      return rows;
    }
    return null;
  }

  if (Array.isArray(rawFrame[0])) {
    return extract2DGrid(rawFrame[0]);
  }

  return null;
}

function drawGrid(canvas: HTMLCanvasElement, grid: number[][], cellSize: number): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) {
    return;
  }

  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = Number(grid[r][c] ?? 0);
      ctx.fillStyle = colorForValue(value);
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }
}

function hasActionXY(value: ActionXY | null | undefined): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return value.x !== undefined || value.y !== undefined;
}

export function ArgAgiFrameViewer({
  title,
  records,
  emptyMessage = DEFAULT_EMPTY,
  statusBadge,
}: ArgAgiFrameViewerProps) {
  const [index, setIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (records.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((prev) => Math.min(prev, records.length - 1));
  }, [records.length]);

  const current = records[index] ?? null;
  const grid = useMemo(() => extract2DGrid(current?.frame), [current]);

  useEffect(() => {
    if (!canvasRef.current || !grid) {
      return;
    }
    drawGrid(canvasRef.current, grid, FRAME_CELL_SIZE);
  }, [grid]);

  return (
    <Card className="bg-gray-900 border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-cyan-400" />
          <h3 className="text-gray-100 text-sm font-mono">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge ? (
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 border">
              {statusBadge}
            </Badge>
          ) : null}
          <Badge className="bg-gray-800 text-gray-300 border border-gray-700">
            {records.length} frame{records.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {current ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 border">
              step {current.step}
            </Badge>
            {current.state ? (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 border">
                {String(current.state)}
              </Badge>
            ) : null}
            {typeof current.levels_completed === 'number' ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/40 border">
                levels_completed={current.levels_completed}
              </Badge>
            ) : null}
            {current.action ? (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 border">
                action={String(current.action)}
              </Badge>
            ) : null}
            {hasActionXY(current.action_xy) ? (
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 border">
                x={String(current.action_xy?.x ?? '?')}, y={String(current.action_xy?.y ?? '?')}
              </Badge>
            ) : null}
            <span className="text-gray-400">{new Date(current.timestamp).toLocaleTimeString()}</span>
          </div>

          {grid ? (
            <div className="overflow-auto rounded-md border border-gray-700 bg-black/40 p-2">
              <canvas ref={canvasRef} className="block mx-auto" style={{ imageRendering: 'pixelated' }} />
            </div>
          ) : (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
              Frame payload is present but not renderable as a numeric 2D grid.
            </div>
          )}

          {records.length > 1 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Play className="size-3" />
                <span>
                  {index + 1} / {records.length}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={records.length - 1}
                value={index}
                onChange={(event) => setIndex(Number(event.target.value))}
                className="w-full accent-green-500"
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-gray-700 bg-gray-800/40 p-3 text-sm text-gray-400">
          {emptyMessage}
        </div>
      )}
    </Card>
  );
}
