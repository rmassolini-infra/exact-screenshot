import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Upload, RefreshCw, Trash2, XCircle, Loader2, Eye, CheckCircle2, AlertTriangle, MinusCircle, Download, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EvidenceViewer from '@/components/ambiental/EvidenceViewer';
import { BR01_META, BR01_SHA256, extractFromPdf, isPdfMagic, sha256Hex } from '@/lib/ambiental/extract';
import { buildSections, countStatus, evaluate, fingerprint, incrementalDiff, reviewValid, SECTION_TITLES } from '@/lib/ambiental/rules';
import { clearState, loadState, MAX_BYTES, openPdf, saveState } from '@/lib/ambiental/browser';
import { buildJson, buildMarkdown, buildPdf, download, DISCLAIMER, type MinutaInput } from '@/lib/ambiental/minuta';
import { Dec } from '@/lib/ambiental/decimal';
import type { CheckResult, ExtractedField, ExtractionResult, Review } from '@/lib/ambiental/types';

type Status = 'idle' | 'loading' | 'ok' | 'error';
interface DocState { name: string; source: 'BR01' | 'upload'; bytes: Uint8Array; sha: string }

const STATUS_UI = {
  consistente: { label: 'Consistente', cls: 'text-green-brand border-green-brand/40 bg-green-brand/10', Icon: CheckCircle2 },
  revisao: { label: 'Revisão necessária', cls: 'text-amber-brand border-amber-brand/40 bg-amber-brand/10', Icon: AlertTriangle },
  nao_avaliavel: { label: 'Não avaliável', cls: 'text-muted-foreground border-border bg-muted/30', Icon: MinusCircle },
} as const;

const LAYOUT_UI: Record<string, string> = {
  BR01: 'Reconhecido: BR01 (hash conferido)',
  parcial: 'Layout não validado — campos parciais, revisão necessária',
  nao_reconhecido: 'Layout não reconhecido — nenhum campo extraído',
  ocr_necessario: 'OCR necessário — PDF sem camada de texto',
};

const num = (v?: string) => (v === undefined ? '—' : Dec.parse(v).toBR(Math.min(4, (v.split('.')[1] ?? '').length)));

const AmbientalPage = () => {
  const [sel, setSel] = useState<'BR01' | 'upload'>('BR01');
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<DocState | null>(null);
  const [ex, setEx] = useState<ExtractionResult | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [mode, setMode] = useState<'p3' | 'full'>('full');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [evidence, setEvidence] = useState<ExtractedField | null>(null);
  const [reviewing, setReviewing] = useState<CheckResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean; destroy?: () => void } | null>(null);

  const process = useCallback(async (bytes: Uint8Array, name: string, source: 'BR01' | 'upload') => {
    const token = { cancelled: false } as { cancelled: boolean; destroy?: () => void };
    cancelRef.current = token;
    setStatus('loading'); setError(''); setEx(null);
    try {
      if (bytes.byteLength > MAX_BYTES) throw new Error(`Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`);
      if (!isPdfMagic(bytes)) throw new Error('Arquivo inválido: não é um PDF (assinatura %PDF ausente).');
      setProgress('Calculando SHA-256…');
      const sha = await sha256Hex(bytes);
      if (source === 'BR01' && sha !== BR01_SHA256) throw new Error(`Arquivo do caso BR01 divergente (SHA-256 ${sha}). Processamento interrompido.`);
      setProgress('Lendo páginas do PDF…');
      const task = openPdf(bytes);
      token.destroy = () => task.destroy();
      const pdf = await task.promise;
      const result = await extractFromPdf(pdf, sha, () => token.cancelled);
      await task.destroy();
      if (token.cancelled) throw new Error('CANCELADO');
      setDoc({ name, source, bytes, sha });
      setEx(result);
      setStatus('ok');
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setStatus('error');
      setError(token.cancelled || msg === 'CANCELADO' ? 'Processamento cancelado pelo usuário.' : /Invalid PDF|InvalidPDF|password/i.test(msg) ? `PDF corrompido ou protegido: ${msg}` : msg);
    } finally { setProgress(''); }
  }, []);

  const loadBR01 = useCallback(async () => {
    setStatus('loading'); setError(''); setProgress('Baixando PDF público (cópia local same-origin)…');
    try {
      const r = await fetch(BR01_META.urlLocal);
      if (!r.ok) throw new Error(`Falha ao obter o PDF do caso (HTTP ${r.status}).`);
      await process(new Uint8Array(await r.arrayBuffer()), 'BR01_parecer_capelinha.pdf', 'BR01');
    } catch (e: any) { setStatus('error'); setError(e?.message ?? String(e)); setProgress(''); }
  }, [process]);

  // Restaura trabalho salvo neste navegador
  useEffect(() => {
    (async () => {
      try {
        const s = await loadState();
        if (s) {
          setMode(s.mode); setReviews(s.reviews ?? []); setSel(s.source);
          if (s.source === 'BR01') await loadBR01();
          else if (s.bytes) await process(new Uint8Array(s.bytes), s.fileName, 'upload');
        }
      } catch (e: any) { setError(`Não foi possível ler o armazenamento local: ${e?.message}`); }
      setHydrated(true);
    })();
  }, [loadBR01, process]);

  // Persiste
  useEffect(() => {
    if (!hydrated || !doc) return;
    saveState({ source: doc.source, fileName: doc.name, bytes: doc.source === 'upload' ? doc.bytes.slice().buffer : undefined, mode, reviews, savedAt: new Date().toISOString() }).catch(() => {});
  }, [hydrated, doc, mode, reviews]);

  const handleLoad = async () => {
    if (sel === 'BR01') return loadBR01();
    if (!file) { setStatus('error'); setError('Selecione um arquivo PDF.'); return; }
    if (file.size > MAX_BYTES) { setStatus('error'); setError(`Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`); return; }
    await process(new Uint8Array(await file.arrayBuffer()), file.name, 'upload');
  };

  const cancel = () => { if (cancelRef.current) { cancelRef.current.cancelled = true; cancelRef.current.destroy?.(); } };

  const doClear = async () => {
    await clearState();
    setDoc(null); setEx(null); setReviews([]); setStatus('idle'); setError(''); setFile(null); setMode('full');
    setConfirmClear(false);
  };

  const fields = useMemo(() => {
    if (!ex) return {} as Record<string, ExtractedField>;
    return mode === 'p3' ? Object.fromEntries(Object.entries(ex.fields).filter(([, f]) => f.page === 3)) : ex.fields;
  }, [ex, mode]);
  const checks = useMemo(() => evaluate(fields), [fields]);
  const counts = useMemo(() => countStatus(checks), [checks]);
  const sections = useMemo(() => buildSections(fields, checks), [fields, checks]);
  const diff = useMemo(() => {
    if (!ex) return null;
    const p3 = Object.fromEntries(Object.entries(ex.fields).filter(([, f]) => f.page === 3));
    return incrementalDiff(p3, ex.fields);
  }, [ex]);

  const isBR01 = doc?.sha === BR01_SHA256;
  const minuta = (): MinutaInput => ({
    docName: doc!.name, caseLabel: isBR01 ? `${BR01_META.titulo} · processo ${BR01_META.processo}` : 'Documento do usuário (não identificado como caso conhecido)',
    sha256: doc!.sha, numPages: ex!.numPages, mode, fields, checks, sections, reviews, generatedAt: new Date().toISOString(),
  });
  const base = isBR01 ? 'BR01_minuta_conferencia' : 'minuta_conferencia';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan">DueDD Ambiental · Desafio 9 Cemig</div>
        <h1 className="text-2xl font-bold text-foreground">Conferência documental de parecer técnico</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Documento → campos com evidência → conferências determinísticas → revisão humana → minuta. Escopo: conferência documental; não é PIA completo, licença nem aprovação.
        </p>
      </div>

      {/* Fonte */}
      <section className="glass-panel p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="fonte">Documento</Label>
            <select id="fonte" value={sel} onChange={(e) => setSel(e.target.value as any)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="BR01">Caso público BR01 — Capelinha</option>
              <option value="upload">Carregar PDF próprio</option>
            </select>
          </div>
          {sel === 'upload' && (
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="arquivo">Arquivo PDF (até 25 MB)</Label>
              <Input id="arquivo" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {status === 'loading' ? (
              <Button variant="outline" onClick={cancel}><XCircle className="w-4 h-4 mr-1" />Cancelar</Button>
            ) : (
              <Button onClick={handleLoad}>{sel === 'BR01' ? <FileText className="w-4 h-4 mr-1" /> : <Upload className="w-4 h-4 mr-1" />}Carregar caso</Button>
            )}
            <Button variant="outline" disabled={!doc || status === 'loading'} onClick={() => doc && process(doc.bytes, doc.name, doc.source)}><RefreshCw className="w-4 h-4 mr-1" />Reprocessar</Button>
            <Button variant="outline" disabled={status === 'loading' || (!doc && !reviews.length)} onClick={() => setConfirmClear(true)}><Trash2 className="w-4 h-4 mr-1" />Limpar / novo documento</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" />Trabalho salvo neste navegador (IndexedDB). Arquivos próprios não são enviados a servidor nem ficam públicos; não há colaboração em nuvem.</p>

        {status === 'loading' && <div className="text-sm text-cyan flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Processando…'}</div>}
        {status === 'error' && <div role="alert" className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-3">{error}</div>}
        {status === 'idle' && !doc && <div className="text-sm text-muted-foreground">Nenhum documento carregado. Selecione o caso público ou um PDF próprio e clique em “Carregar caso”.</div>}

        {doc && ex && status === 'ok' && (
          <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div><dt className="text-muted-foreground">Arquivo</dt><dd className="font-mono break-all">{doc.name}</dd></div>
            <div><dt className="text-muted-foreground">Origem</dt><dd>{isBR01 ? <>Parecer {BR01_META.processo} · {BR01_META.empreendimento} · {BR01_META.orgao} · <a className="text-cyan underline" href={BR01_META.urlOriginal} target="_blank" rel="noreferrer">portal original</a></> : 'PDF carregado pelo usuário (sem identidade de caso conhecido)'}</dd></div>
            <div><dt className="text-muted-foreground">SHA-256</dt><dd className="font-mono break-all">{doc.sha}</dd></div>
            <div><dt className="text-muted-foreground">Páginas · estado</dt><dd>{ex.numPages} páginas · <span className={ex.layout === 'BR01' ? 'text-green-brand' : 'text-amber-brand'}>{LAYOUT_UI[ex.layout]}</span></dd></div>
          </dl>
        )}
        {ex && ex.issues.length > 0 && status === 'ok' && (
          <ul className="text-xs text-amber-brand list-disc pl-5 space-y-0.5">{ex.issues.map((i, k) => <li key={k}>{i}</li>)}</ul>
        )}
      </section>

      {doc && ex && status === 'ok' && (
        <>
          {/* Modo incremental */}
          <section className="glass-panel p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Incorporação de trechos do mesmo parecer</h2>
                <p className="text-xs text-muted-foreground">Mesmo documento e mesmo hash; muda apenas o recorte lido. Não é revisão histórica nem alteração de geometria.</p>
              </div>
              <div role="group" aria-label="Recorte" className="inline-flex rounded-md border border-border overflow-hidden">
                {(['p3', 'full'] as const).map((m) => (
                  <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={`px-3 py-2 text-xs ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {m === 'p3' ? 'Somente quadro da p. 3' : 'Quadro + narrativa da p. 7'}
                  </button>
                ))}
              </div>
            </div>
            {diff && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.preserved.length}</div><div className="text-[11px] text-muted-foreground">campos originais preservados</div></div>
                <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.added.length}</div><div className="text-[11px] text-muted-foreground">campos novos (p. 7)</div></div>
                <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.changedSections.length}</div><div className="text-[11px] text-muted-foreground">seções da minuta atualizadas</div></div>
              </div>
            )}
          </section>

          {/* Contagens derivadas */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-panel p-3"><div className="text-[11px] text-muted-foreground">Campos no recorte</div><div className="text-2xl font-mono">{Object.keys(fields).length}</div></div>
            {(['consistente', 'revisao', 'nao_avaliavel'] as const).map((s) => {
              const u = STATUS_UI[s];
              return <div key={s} className={`glass-panel p-3 border ${u.cls}`}><div className="text-[11px] flex items-center gap-1"><u.Icon className="w-3.5 h-3.5" />{u.label}</div><div className="text-2xl font-mono">{counts[s]}</div></div>;
            })}
          </section>

          <Tabs defaultValue="campos">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="campos">Campos</TabsTrigger>
              <TabsTrigger value="regras">Conferências</TabsTrigger>
              <TabsTrigger value="revisoes">Revisões ({reviews.length})</TabsTrigger>
              <TabsTrigger value="minuta">Minuta</TabsTrigger>
            </TabsList>

            <TabsContent value="campos" className="glass-panel p-0 overflow-x-auto">
              {Object.keys(fields).length === 0 ? <div className="p-4 text-sm text-muted-foreground">Nenhum campo extraído neste recorte.</div> : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b border-border"><tr>
                    <th className="text-left p-2">Campo</th><th className="text-right p-2">Valor original</th><th className="text-right p-2">Normalizado</th><th className="p-2">Unidade (fonte)</th><th className="p-2">Pág.</th><th className="text-left p-2 min-w-[260px]">Trecho</th><th className="p-2"></th>
                  </tr></thead>
                  <tbody>
                    {Object.values(fields).map((f) => (
                      <tr key={f.key} className="border-b border-border/50 align-top">
                        <td className="p-2"><div className="font-medium">{f.label}</div><div className="font-mono text-[10px] text-muted-foreground">{f.key}</div></td>
                        <td className="p-2 text-right font-mono">{f.raw}</td>
                        <td className="p-2 text-right font-mono">{f.value}</td>
                        <td className={`p-2 text-center font-mono ${f.key === 'cedro_madeira' && f.unit !== 'm³' ? 'text-amber-brand' : ''}`}>{f.unit}</td>
                        <td className="p-2 text-center">{f.page}</td>
                        <td className="p-2 text-muted-foreground">{f.context}{f.otherOccurrences.length > 0 && <div className="text-amber-brand mt-1">+{f.otherOccurrences.length} outra(s) ocorrência(s) do mesmo número — contexto preservado</div>}</td>
                        <td className="p-2"><Button size="sm" variant="outline" onClick={() => setEvidence(f)}><Eye className="w-3.5 h-3.5 mr-1" />Ver evidência</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="regras" className="glass-panel p-0 overflow-x-auto">
              <p className="text-xs text-muted-foreground p-3">Aritmética decimal exata, tolerâncias absolutas. Verificações relacionadas — não são incidentes independentes.</p>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border"><tr>
                  <th className="text-left p-2">Regra</th><th className="text-left p-2">Entradas</th><th className="text-right p-2">Calculado</th><th className="text-right p-2">Informado</th><th className="text-right p-2">Δ</th><th className="text-right p-2">Tol.</th><th className="p-2">Estado</th><th className="p-2">Revisão</th>
                </tr></thead>
                <tbody>
                  {checks.map((c) => {
                    const u = STATUS_UI[c.status];
                    const rs = reviews.filter((r) => r.checkId === c.id);
                    const valid = rs.filter((r) => reviewValid(r, doc.sha, fields, checks));
                    return (
                      <tr key={c.id} className="border-b border-border/50 align-top">
                        <td className="p-2"><span className="font-mono text-cyan">{c.id}</span> {c.label}</td>
                        <td className="p-2 font-mono text-[10px] text-muted-foreground">{c.dependencies.map((d) => <div key={d} className={c.missing.includes(d) ? 'text-destructive' : ''}>{d}{fields[d] ? ` = ${fields[d].raw} ${fields[d].unit}` : ' (ausente)'}</div>)}</td>
                        <td className="p-2 text-right font-mono">{c.op === 'unit' ? (c.observedUnit ?? '—') : num(c.calculated)}</td>
                        <td className="p-2 text-right font-mono">{c.op === 'unit' ? `esperada ${c.expectedUnit}` : num(c.reported)}</td>
                        <td className="p-2 text-right font-mono">{c.delta ?? '—'}</td>
                        <td className="p-2 text-right font-mono">±{c.tolerance}</td>
                        <td className="p-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${u.cls}`}><u.Icon className="w-3 h-3" />{u.label}</span>{c.reason === 'incompatible_units' && <div className="text-destructive mt-1">Unidades incompatíveis — operação bloqueada</div>}</td>
                        <td className="p-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => setReviewing(c)}>Registrar</Button>
                          {rs.length > 0 && <div className="text-[10px] mt-1 text-muted-foreground">{valid.length} vigente(s){rs.length - valid.length ? ` · ${rs.length - valid.length} invalidada(s)` : ''}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="revisoes" className="glass-panel p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Histórico local. “Conferido” não altera o valor fonte e não equivale a assinatura técnica ou licenciamento. Revisões ficam invalidadas quando o documento ou uma entrada da regra muda; o registro original é preservado.</p>
              {reviews.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma revisão registrada.</div>}
              {[...reviews].reverse().map((r) => {
                const ok = reviewValid(r, doc.sha, fields, checks);
                return (
                  <div key={r.id} className="border border-border rounded p-2 text-xs">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-mono text-cyan">{r.checkId}</span>
                      <span>{r.kind === 'conferido' ? 'Conferido' : 'Observação'}</span>
                      <span className="text-muted-foreground">{r.reviewer} · {new Date(r.date).toLocaleDateString('pt-BR')}</span>
                      <span className={ok ? 'text-green-brand' : 'text-destructive'}>{ok ? 'vigente' : 'invalidada — documento ou entrada mudou'}</span>
                    </div>
                    <div className="mt-1">{r.note}</div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="minuta" className="glass-panel p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => buildPdf(minuta()).save(`${base}.pdf`)}><Download className="w-4 h-4 mr-1" />PDF</Button>
                <Button variant="outline" onClick={() => download(`${base}.md`, buildMarkdown(minuta()), 'text/markdown;charset=utf-8')}><Download className="w-4 h-4 mr-1" />Markdown editável (.md)</Button>
                <Button variant="outline" onClick={() => download(`${base}_evidencias.json`, JSON.stringify(buildJson(minuta()), null, 2), 'application/json')}><Download className="w-4 h-4 mr-1" />JSON evidências/regras/revisões</Button>
              </div>
              <p className="text-xs text-amber-brand">{DISCLAIMER}</p>
              {Object.entries(SECTION_TITLES).map(([k, t], i) => (
                <div key={k}>
                  <h3 className="text-sm font-semibold">{i + 1}. {t}</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-line font-mono">{sections[k]}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}

      <EvidenceViewer bytes={doc?.bytes ?? null} field={evidence} onClose={() => setEvidence(null)} />

      <ReviewDialog check={reviewing} onClose={() => setReviewing(null)} onSave={(kind, note, reviewer, date) => {
        if (!reviewing || !doc) return;
        setReviews((rs) => [...rs, { id: crypto.randomUUID(), checkId: reviewing.id, kind, note, reviewer, date, fingerprint: fingerprint(doc.sha, fields, reviewing.dependencies) }]);
        setReviewing(null);
      }} />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar trabalho salvo?</AlertDialogTitle>
            <AlertDialogDescription>O documento carregado e {reviews.length} revisão(ões) salvas neste navegador serão apagados. Exporte o JSON antes, se precisar do histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={doClear}>Apagar e começar de novo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ReviewDialog = ({ check, onClose, onSave }: { check: CheckResult | null; onClose: () => void; onSave: (k: Review['kind'], n: string, r: string, d: string) => void }) => {
  const [kind, setKind] = useState<Review['kind']>('observacao');
  const [note, setNote] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => { if (check) { setNote(''); setKind('observacao'); } }, [check]);
  const ok = note.trim() && reviewer.trim() && date;
  return (
    <Dialog open={!!check} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisão local · {check?.id}</DialogTitle>
          <DialogDescription>{check?.label}. O registro não altera o valor fonte e não é assinatura técnica nem aprovação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['observacao', 'conferido'] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={kind === k ? 'default' : 'outline'} onClick={() => setKind(k)}>{k === 'conferido' ? 'Conferido' : 'Observação'}</Button>
            ))}
          </div>
          <div className="space-y-1"><Label htmlFor="rv-note">Observação</Label><Textarea id="rv-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label htmlFor="rv-who">Responsável informado</Label><Input id="rv-who" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Nome de quem revisou" /></div>
            <div className="space-y-1"><Label htmlFor="rv-date">Data</Label><Input id="rv-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!ok} onClick={() => onSave(kind, note.trim(), reviewer.trim(), new Date(date + 'T12:00:00').toISOString())}>Salvar revisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AmbientalPage;
