import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { openPdf } from '@/lib/ambiental/browser';
import type { ExtractedField } from '@/lib/ambiental/types';

interface Props { bytes: Uint8Array | null; field: ExtractedField | null; onClose: () => void }

const EvidenceViewer = ({ bytes, field, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<{ l: number; t: number; w: number; h: number }[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!bytes || !field) return;
    let cancelled = false;
    const task = openPdf(bytes);
    setState('loading'); setRects([]);
    (async () => {
      try {
        const doc = await task.promise;
        const page = await doc.getPage(field.page);
        const base = page.getViewport({ scale: 1 });
        const avail = Math.min(860, (wrapRef.current?.clientWidth ?? 800));
        const vp = page.getViewport({ scale: avail / base.width });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = vp.width * dpr; canvas.height = vp.height * dpr;
        canvas.style.width = `${vp.width}px`; canvas.style.height = `${vp.height}px`;
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (cancelled) return;
        setRects(field.bboxes.map(([x0, y0, x1, y1]) => {
          const [a, b, c, d] = vp.convertToViewportRectangle([x0, y0, x1, y1]);
          return { l: Math.min(a, c) - 2, t: Math.min(b, d) - 2, w: Math.abs(c - a) + 4, h: Math.abs(d - b) + 4 };
        }));
        setState('ok');
        setTimeout(() => wrapRef.current?.querySelector('[data-hl]')?.scrollIntoView({ block: 'center' }), 50);
      } catch (e: any) {
        if (!cancelled) { setState('error'); setErr(e?.message ?? String(e)); }
      }
    })();
    return () => { cancelled = true; task.destroy(); };
  }, [bytes, field]);

  return (
    <Dialog open={!!field} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-hidden flex flex-col min-h-0 p-3 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Evidência · {field?.label} — página {field?.page}</DialogTitle>
          <DialogDescription>
            Valor original <span className="font-mono text-foreground">{field?.raw} {field?.unit}</span> · {field?.section}
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 max-h-24 overflow-auto text-xs bg-muted/40 border border-border rounded p-2 font-mono leading-relaxed break-words">{field?.context}</div>
        {field && field.otherOccurrences.length > 0 && (
          <details className="shrink-0 text-xs border border-amber-brand/40 rounded">
            <summary className="cursor-pointer px-2 py-1 text-amber-brand">
              O mesmo número aparece em mais {field.otherOccurrences.length} ponto(s) do documento — ver lista
            </summary>
            <ul className="max-h-32 overflow-auto px-2 pb-2 space-y-1 text-muted-foreground">
              {field.otherOccurrences.map((o, i) => <li key={i} className="break-words">p.{o.page}: {o.context}</li>)}
            </ul>
          </details>
        )}
        <div ref={wrapRef} className="relative overflow-auto flex-1 min-h-[45vh] bg-muted/20 rounded border border-border">
          {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" />Renderizando página…</div>}
          {state === 'error' && <div className="p-4 text-sm text-destructive">Falha ao renderizar: {err}</div>}
          <div className="relative inline-block">
            <canvas ref={canvasRef} className="block bg-white" />
            {rects.map((r, i) => (
              <div key={i} data-hl className="absolute border-2 border-amber-brand bg-amber-brand/25 rounded-sm pointer-events-none" style={{ left: r.l, top: r.t, width: r.w, height: r.h }} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EvidenceViewer;
