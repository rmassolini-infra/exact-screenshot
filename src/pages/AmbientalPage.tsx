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
import { clearState, loadState, MAX_BYTES, openPdf, saveState, storageErrorMessage } from '@/lib/ambiental/browser';
import { buildJson, buildMarkdown, buildPdf, download, DISCLAIMER, modeLabel, type MinutaInput } from '@/lib/ambiental/minuta';
import { Dec } from '@/lib/ambiental/decimal';
import type { CheckResult, ExtractedField, ExtractionResult, Review } from '@/lib/ambiental/types';

type OpStatus = 'idle' | 'loading' | 'ok' | 'error' | 'cancelled';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
interface DocState { name: string; source: 'BR01' | 'upload'; bytes: Uint8Array; sha: string }
type LoadReq = { type: 'BR01' } | { type: 'upload'; bytes: Uint8Array; name: string };
interface Op { ac: AbortController; destroy?: () => void }

const STATUS_UI = {
  consistente: { label: 'Consistente', cls: 'text-green-brand border-green-brand/40 bg-green-brand/10', Icon: CheckCircle2 },
  revisao: { label: 'Revisão necessária', cls: 'text-amber-brand border-amber-brand/40 bg-amber-brand/10', Icon: AlertTriangle },
  nao_avaliavel: { label: 'Não avaliável', cls: 'text-muted-foreground border-border bg-muted/30', Icon: MinusCircle },
} as const;

const LAYOUT_UI: Record<string, string> = {
  BR01: 'Caso público BR01 reconhecido (SHA-256 conferido)',
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
  const [status, setStatus] = useState<OpStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [mode, setMode] = useState<'p3' | 'full'>('full');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [evidence, setEvidence] = useState<ExtractedField | null>(null);
  const [reviewing, setReviewing] = useState<CheckResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<LoadReq | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [save, setSave] = useState<{ status: SaveStatus; error?: string; at?: string }>({ status: 'idle' });
  const opRef = useRef<Op | null>(null);
  const mountedRef = useRef(true);
  const saveSeq = useRef(0);

  useEffect(() => () => { mountedRef.current = false; opRef.current?.ac.abort(); opRef.current?.destroy?.(); }, []);

  /** Uma operação única (download → leitura → extração) com token próprio. */
  const runLoad = useCallback(async (req: LoadReq) => {
    opRef.current?.ac.abort(); opRef.current?.destroy?.();
    const op: Op = { ac: new AbortController() };
    opRef.current = op;
    const alive = () => mountedRef.current && opRef.current === op && !op.ac.signal.aborted;
    setStatus('loading'); setError('');
    try {
      let bytes: Uint8Array, name: string;
      if (req.type === 'BR01') {
        setProgress('Baixando o PDF público do caso BR01…');
        const r = await fetch(BR01_META.urlLocal, { signal: op.ac.signal });
        if (!r.ok) throw new Error(`Falha ao obter o PDF do caso (HTTP ${r.status}).`);
        bytes = new Uint8Array(await r.arrayBuffer());
        name = 'BR01_parecer_capelinha.pdf';
      } else { bytes = req.bytes; name = req.name; }
      if (!alive()) return;
      if (bytes.byteLength > MAX_BYTES) throw new Error(`Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`);
      if (!isPdfMagic(bytes)) throw new Error('Arquivo inválido: não é um PDF.');
      setProgress('Calculando SHA-256…');
      const sha = await sha256Hex(bytes);
      if (!alive()) return;
      if (req.type === 'BR01' && sha !== BR01_SHA256) throw new Error(`Arquivo do caso BR01 divergente (SHA-256 ${sha}). Processamento interrompido.`);
      setProgress('Lendo páginas do PDF…');
      const task = openPdf(bytes);
      op.destroy = () => { task.destroy(); };
      const pdf = await task.promise;
      const result = await extractFromPdf(pdf, sha, () => !alive());
      if (!alive()) return;
      setDoc({ name, source: req.type, bytes, sha });
      setEx(result);
      if (sha !== BR01_SHA256) setMode('full'); // filtro de páginas só existe para BR01
      setStatus('ok');
    } catch (e: any) {
      if (!alive()) return; // cancelado / substituído / desmontado: resultado descartado
      const msg = e?.message ?? String(e);
      setStatus('error');
      setError(/Invalid PDF|InvalidPDF|password/i.test(msg) ? `PDF corrompido ou protegido: ${msg}` : msg);
    } finally {
      op.destroy?.();
      if (opRef.current === op) { opRef.current = null; if (mountedRef.current) setProgress(''); }
    }
  }, []);

  const cancel = () => {
    const op = opRef.current;
    if (!op) return;
    op.ac.abort(); op.destroy?.(); opRef.current = null;
    setStatus('cancelled'); setProgress('');
  };

  // Restaura trabalho salvo neste navegador
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const s = await loadState();
        if (off || !s) return;
        setMode(s.mode); setReviews(s.reviews ?? []); setSel(s.source);
        if (s.source === 'BR01') runLoad({ type: 'BR01' });
        else if (s.bytes) runLoad({ type: 'upload', bytes: new Uint8Array(s.bytes), name: s.fileName });
      } catch (e) {
        if (!off) setSave({ status: 'error', error: `Não foi possível ler o trabalho salvo: ${storageErrorMessage(e)}` });
      } finally { if (!off) setHydrated(true); }
    })();
    return () => { off = true; };
  }, [runLoad]);

  const persist = useCallback(async () => {
    if (!doc) return;
    const seq = ++saveSeq.current;
    setSave({ status: 'saving' });
    try {
      await saveState({ source: doc.source, fileName: doc.name, bytes: doc.source === 'upload' ? doc.bytes.slice().buffer : undefined, mode, reviews, savedAt: new Date().toISOString() });
      if (seq === saveSeq.current && mountedRef.current) setSave({ status: 'saved', at: new Date().toLocaleTimeString('pt-BR') });
    } catch (e) {
      if (seq === saveSeq.current && mountedRef.current) setSave({ status: 'error', error: storageErrorMessage(e) });
    }
  }, [doc, mode, reviews]);

  useEffect(() => { if (hydrated && doc) persist(); }, [hydrated, doc, mode, reviews, persist]);

  const requestLoad = async () => {
    let req: LoadReq;
    if (sel === 'BR01') req = { type: 'BR01' };
    else {
      if (!file) { setStatus('error'); setError('Selecione um arquivo PDF.'); return; }
      if (file.size > MAX_BYTES) { setStatus('error'); setError(`Arquivo excede ${MAX_BYTES / 1024 / 1024} MB.`); return; }
      req = { type: 'upload', bytes: new Uint8Array(await file.arrayBuffer()), name: file.name };
    }
    if (doc && reviews.length > 0) setPendingLoad(req);
    else runLoad(req);
  };

  const doClear = async () => {
    try {
      await clearState();
      setDoc(null); setEx(null); setReviews([]); setStatus('idle'); setError(''); setFile(null); setMode('full');
      setSave({ status: 'idle' });
      setConfirmClear(false);
    } catch (e) {
      setConfirmClear(false);
      setSave({ status: 'error', error: `Não foi possível limpar o armazenamento: ${storageErrorMessage(e)}. Nada foi apagado.` });
    }
  };

  const isBR01 = doc?.sha === BR01_SHA256;
  const effMode: 'p3' | 'full' = isBR01 ? mode : 'full';
  const fields = useMemo(() => {
    if (!ex) return {} as Record<string, ExtractedField>;
    return effMode === 'p3' ? Object.fromEntries(Object.entries(ex.fields).filter(([, f]) => f.page === 3)) : ex.fields;
  }, [ex, effMode]);
  const checks = useMemo(() => evaluate(fields), [fields]);
  const counts = useMemo(() => countStatus(checks), [checks]);
  const sections = useMemo(() => buildSections(fields, checks), [fields, checks]);
  const diff = useMemo(() => {
    if (!ex || !isBR01) return null;
    const p3 = Object.fromEntries(Object.entries(ex.fields).filter(([, f]) => f.page === 3));
    return incrementalDiff(p3, ex.fields);
  }, [ex, isBR01]);

  const minuta = (): MinutaInput => ({
    docName: doc!.name, caseLabel: isBR01 ? `${BR01_META.titulo} · processo ${BR01_META.processo}` : `Documento do usuário: ${doc!.name}`,
    sha256: doc!.sha, numPages: ex!.numPages, mode: effMode, isBR01, fields, checks, sections, reviews, generatedAt: new Date().toISOString(),
  });
  const base = isBR01 ? 'BR01_minuta_conferencia' : 'minuta_conferencia_documento';
  const exportJson = () => download(`${base}_evidencias.json`, JSON.stringify(buildJson(minuta()), null, 2), 'application/json');
  const reviewSource = (r: Review) => !r.docSha ? 'fonte não registrada' : r.docSha === doc?.sha ? 'documento atual' : `outro documento: ${r.docName ?? '?'} (${r.docSha.slice(0, 12)}…)`;

  return (
    <div className="max-w-7xl mx-auto space-y-5 min-w-0">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan">DueDD Ambiental · Desafio 9 Cemig</div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Conferência documental de parecer técnico</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Documento → campos com evidência → conferências determinísticas → revisão humana → minuta. Escopo: conferência documental; não é PIA completo, licença nem aprovação.
        </p>
      </div>

      {/* Fonte */}
      <section className="glass-panel p-3 sm:p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 space-y-1.5 min-w-0">
            <Label htmlFor="fonte">Documento</Label>
            <select id="fonte" value={sel} onChange={(e) => setSel(e.target.value as any)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="BR01">Caso público BR01 — Capelinha</option>
              <option value="upload">Carregar PDF próprio</option>
            </select>
          </div>
          {sel === 'upload' && (
            <div className="flex-1 space-y-1.5 min-w-0">
              <Label htmlFor="arquivo">Arquivo PDF (até 25 MB)</Label>
              <Input id="arquivo" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {status === 'loading' ? (
              <Button variant="outline" onClick={cancel}><XCircle className="w-4 h-4 mr-1" />Cancelar</Button>
            ) : (
              <Button onClick={requestLoad}>{sel === 'BR01' ? <FileText className="w-4 h-4 mr-1" /> : <Upload className="w-4 h-4 mr-1" />}Carregar caso</Button>
            )}
            <Button variant="outline" disabled={!doc || status === 'loading'} onClick={() => doc && runLoad(doc.source === 'BR01' ? { type: 'BR01' } : { type: 'upload', bytes: doc.bytes, name: doc.name })}><RefreshCw className="w-4 h-4 mr-1" />Reprocessar</Button>
            <Button variant="outline" disabled={status === 'loading' || (!doc && !reviews.length)} onClick={() => setConfirmClear(true)}><Trash2 className="w-4 h-4 mr-1" />Limpar / novo documento</Button>
          </div>
        </div>

        <div role="status" aria-live="polite" className="text-xs flex flex-wrap items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          {save.status === 'saving' && <span className="text-cyan">Salvando…</span>}
          {save.status === 'saved' && <span className="text-green-brand">Salvo neste navegador{save.at ? ` às ${save.at}` : ''}</span>}
          {save.status === 'idle' && <span className="text-muted-foreground">O trabalho é salvo apenas neste navegador.</span>}
          {save.status === 'error' && (
            <>
              <span className="text-destructive font-medium">Falha ao salvar — exporte antes de sair. {save.error}</span>
              {doc && <Button size="sm" variant="outline" onClick={persist}>Tentar salvar novamente</Button>}
            </>
          )}
          <span className="text-muted-foreground basis-full">Arquivos próprios não são enviados a servidor nem ficam públicos; não há colaboração em nuvem.</span>
        </div>

        {status === 'loading' && <div className="text-sm text-cyan flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{progress || 'Processando…'}</div>}
        {status === 'cancelled' && <div role="alert" className="text-sm text-amber-brand border border-amber-brand/40 bg-amber-brand/10 rounded p-3">Processamento cancelado. {doc ? 'O documento anterior continua carregado.' : 'Nenhum documento carregado.'}</div>}
        {status === 'error' && <div role="alert" className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-3">{error}{doc ? ' O documento anterior continua carregado.' : ''}</div>}
        {status === 'idle' && !doc && <div className="text-sm text-muted-foreground">Nenhum documento carregado. Selecione o caso público ou um PDF próprio e clique em “Carregar caso”.</div>}

        {doc && ex && (
          <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
            <div className="min-w-0"><dt className="text-muted-foreground">Arquivo</dt><dd className="font-mono break-all">{doc.name}</dd></div>
            <div className="min-w-0"><dt className="text-muted-foreground">Origem</dt><dd>{isBR01 ? <>Caso público BR01 · parecer {BR01_META.processo} · {BR01_META.empreendimento} · {BR01_META.orgao} · <a className="text-cyan underline" href={BR01_META.urlOriginal} target="_blank" rel="noreferrer">portal original</a></> : 'PDF carregado pelo usuário (não corresponde a caso conhecido)'}</dd></div>
            <div className="min-w-0"><dt className="text-muted-foreground">SHA-256</dt><dd className="font-mono break-all">{doc.sha}</dd></div>
            <div className="min-w-0"><dt className="text-muted-foreground">Páginas · estado</dt><dd>{ex.numPages} páginas · <span className={ex.layout === 'BR01' ? 'text-green-brand' : 'text-amber-brand'}>{LAYOUT_UI[ex.layout]}</span></dd></div>
          </dl>
        )}
        {ex && ex.issues.length > 0 && (
          <ul className="text-xs text-amber-brand list-disc pl-5 space-y-0.5">{ex.issues.map((i, k) => <li key={k}>{i}</li>)}</ul>
        )}
      </section>

      {doc && ex && (
        <>
          <section className="glass-panel p-3 sm:p-4 space-y-3">
            {isBR01 ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Incorporação de trechos do mesmo parecer</h2>
                    <p className="text-xs text-muted-foreground">Mesmo documento e mesmo hash; muda apenas o recorte lido. Não é revisão histórica nem alteração de geometria.</p>
                  </div>
                  <div role="group" aria-label="Recorte" className="inline-flex rounded-md border border-border overflow-hidden self-start">
                    {(['p3', 'full'] as const).map((m) => (
                      <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={`px-3 py-2 text-xs ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                        {m === 'p3' ? 'Somente quadro da p. 3' : 'Quadro + narrativa da p. 7'}
                      </button>
                    ))}
                  </div>
                </div>
                {diff && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.preserved.length}</div><div className="text-[11px] text-muted-foreground">campos originais preservados</div></div>
                    <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.added.length}</div><div className="text-[11px] text-muted-foreground">campos novos (p. 7)</div></div>
                    <div className="rounded border border-border p-2"><div className="text-xl font-mono">{diff.changedSections.length}</div><div className="text-[11px] text-muted-foreground">seções da minuta atualizadas</div></div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <h2 className="text-sm font-semibold">Recorte: Documento completo</h2>
                <p className="text-xs text-muted-foreground">Todos os campos extraídos de todas as páginas. Layout não validado: todo campo e toda conferência exigem revisão necessária.</p>
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" aria-label="Contagens">
            <div className="glass-panel p-3"><div className="text-[11px] text-muted-foreground">Campos no recorte</div><div className="text-2xl font-mono">{Object.keys(fields).length}</div></div>
            {(['consistente', 'revisao', 'nao_avaliavel'] as const).map((s) => {
              const u = STATUS_UI[s];
              return <div key={s} className={`glass-panel p-3 border ${u.cls}`}><div className="text-[11px] flex items-center gap-1"><u.Icon className="w-3.5 h-3.5" aria-hidden="true" />{u.label}</div><div className="text-2xl font-mono">{counts[s]}</div></div>;
            })}
          </section>

          <Tabs defaultValue="campos" className="min-w-0">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="campos">Campos</TabsTrigger>
              <TabsTrigger value="regras">Conferências</TabsTrigger>
              <TabsTrigger value="revisoes">Revisões ({reviews.length})</TabsTrigger>
              <TabsTrigger value="minuta">Minuta</TabsTrigger>
            </TabsList>

            <TabsContent value="campos" className="glass-panel p-0 max-w-full overflow-x-auto">
              {Object.keys(fields).length === 0 ? <div className="p-4 text-sm text-muted-foreground">Nenhum campo extraído neste recorte.</div> : (
                <table className="w-full min-w-[820px] text-xs">
                  <thead className="text-muted-foreground border-b border-border"><tr>
                    <th className="text-left p-2">Campo</th><th className="text-right p-2">Valor original</th><th className="text-right p-2">Normalizado</th><th className="p-2">Unidade (fonte)</th><th className="p-2">Pág.</th><th className="text-left p-2 min-w-[260px]">Trecho</th><th className="p-2"><span className="sr-only">Ações</span></th>
                  </tr></thead>
                  <tbody>
                    {Object.values(fields).map((f) => (
                      <tr key={f.key} className="border-b border-border/50 align-top">
                        <td className="p-2"><div className="font-medium">{f.label}</div><div className="font-mono text-[10px] text-muted-foreground">{f.key}</div>{!isBR01 && <div className="text-amber-brand text-[10px]">revisão necessária</div>}</td>
                        <td className="p-2 text-right font-mono">{f.raw}</td>
                        <td className="p-2 text-right font-mono">{f.value}</td>
                        <td className={`p-2 text-center font-mono ${f.key === 'cedro_madeira' && f.unit !== 'm³' ? 'text-amber-brand' : ''}`}>{f.unit}</td>
                        <td className="p-2 text-center">{f.page}</td>
                        <td className="p-2 text-muted-foreground">{f.context}{f.otherOccurrences.length > 0 && <div className="text-amber-brand mt-1">+{f.otherOccurrences.length} outra(s) ocorrência(s) do mesmo número — contexto preservado</div>}</td>
                        <td className="p-2"><Button size="sm" variant="outline" onClick={() => setEvidence(f)}><Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" />Ver evidência</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="regras" className="glass-panel p-0 max-w-full overflow-x-auto">
              <p className="text-xs text-muted-foreground p-3">Aritmética decimal exata, tolerâncias absolutas. Verificações relacionadas — não são incidentes independentes.{!isBR01 && ' Documento não validado: resultados exigem revisão.'}</p>
              <table className="w-full min-w-[900px] text-xs">
                <thead className="text-muted-foreground border-b border-border"><tr>
                  <th className="text-left p-2">Regra</th><th className="text-left p-2">Entradas</th><th className="text-right p-2">Calculado</th><th className="text-right p-2">Informado</th><th className="text-right p-2">Δ</th><th className="text-right p-2">Tol.</th><th className="p-2">Estado</th><th className="p-2">Revisão</th>
                </tr></thead>
                <tbody>
                  {checks.map((c) => {
                    const u = STATUS_UI[c.status];
                    const rs = reviews.filter((r) => r.checkId === c.id);
                    const valid = rs.filter((r) => r.docSha === doc.sha && reviewValid(r, doc.sha, fields, checks));
                    return (
                      <tr key={c.id} className="border-b border-border/50 align-top">
                        <td className="p-2"><span className="font-mono text-cyan">{c.id}</span> {c.label}</td>
                        <td className="p-2 font-mono text-[10px] text-muted-foreground">{c.dependencies.map((d) => <div key={d} className={c.missing.includes(d) ? 'text-destructive' : ''}>{d}{fields[d] ? ` = ${fields[d].raw} ${fields[d].unit}` : ' (ausente)'}</div>)}</td>
                        <td className="p-2 text-right font-mono">{c.op === 'unit' ? (c.observedUnit ?? '—') : num(c.calculated)}</td>
                        <td className="p-2 text-right font-mono">{c.op === 'unit' ? `esperada ${c.expectedUnit}` : num(c.reported)}</td>
                        <td className="p-2 text-right font-mono">{c.delta ?? '—'}</td>
                        <td className="p-2 text-right font-mono">±{c.tolerance}</td>
                        <td className="p-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${u.cls}`}><u.Icon className="w-3 h-3" aria-hidden="true" />{u.label}</span>{c.reason === 'incompatible_units' && <div className="text-destructive mt-1">Unidades incompatíveis — operação bloqueada</div>}</td>
                        <td className="p-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" aria-label={`Registrar revisão de ${c.id}`} onClick={() => setReviewing(c)}>Registrar</Button>
                          {rs.length > 0 && <div className="text-[10px] mt-1 text-muted-foreground">{valid.length} vigente(s){rs.length - valid.length ? ` · ${rs.length - valid.length} invalidada(s)` : ''}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="revisoes" className="glass-panel p-3 sm:p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Histórico local. “Conferido” não altera o valor fonte e não equivale a assinatura técnica ou licenciamento. Revisões ficam invalidadas quando o documento ou uma entrada da regra muda; o registro original é preservado.</p>
              {reviews.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma revisão registrada.</div>}
              {[...reviews].reverse().map((r) => {
                const ok = r.docSha === doc.sha && reviewValid(r, doc.sha, fields, checks);
                return (
                  <div key={r.id} className="border border-border rounded p-2 text-xs">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-mono text-cyan">{r.checkId}</span>
                      <span>{r.kind === 'conferido' ? 'Conferido' : 'Observação'}</span>
                      <span className="text-muted-foreground">{r.reviewer} · {new Date(r.date).toLocaleDateString('pt-BR')}</span>
                      <span className="text-muted-foreground">Fonte: {reviewSource(r)}</span>
                      <span className={ok ? 'text-green-brand' : 'text-destructive'}>{ok ? 'vigente' : 'invalidada — documento ou entrada mudou'}</span>
                    </div>
                    <div className="mt-1 break-words">{r.note}</div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="minuta" className="glass-panel p-3 sm:p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => buildPdf(minuta()).save(`${base}.pdf`)}><Download className="w-4 h-4 mr-1" aria-hidden="true" />PDF</Button>
                <Button variant="outline" onClick={() => download(`${base}.md`, buildMarkdown(minuta()), 'text/markdown;charset=utf-8')}><Download className="w-4 h-4 mr-1" aria-hidden="true" />Markdown editável (.md)</Button>
                <Button variant="outline" onClick={exportJson}><Download className="w-4 h-4 mr-1" aria-hidden="true" />JSON evidências/regras/revisões</Button>
              </div>
              <p className="text-xs text-muted-foreground">Fonte: {isBR01 ? 'Caso público BR01' : 'Documento do usuário'} · Recorte: {modeLabel(effMode, isBR01)}</p>
              <p className="text-xs text-amber-brand">{DISCLAIMER}</p>
              {Object.entries(SECTION_TITLES).map(([k, t], i) => (
                <div key={k} className="min-w-0">
                  <h3 className="text-sm font-semibold">{i + 1}. {t}</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-line break-words font-mono">{sections[k]}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}

      <EvidenceViewer bytes={doc?.bytes ?? null} field={evidence} onClose={() => setEvidence(null)} />

      <ReviewDialog check={reviewing} onClose={() => setReviewing(null)} onSave={(kind, note, reviewer, date) => {
        if (!reviewing || !doc) return;
        const depsSnapshot = Object.fromEntries(reviewing.dependencies.map((k) => [k, fields[k] ? { raw: fields[k].raw, value: fields[k].value, unit: fields[k].unit, page: fields[k].page } : null]));
        setReviews((rs) => [...rs, { id: crypto.randomUUID(), checkId: reviewing.id, kind, note, reviewer, date, fingerprint: fingerprint(doc.sha, fields, reviewing.dependencies), docSha: doc.sha, docName: doc.name, depsSnapshot }]);
        setReviewing(null);
      }} />

      <AlertDialog open={!!pendingLoad} onOpenChange={(o) => !o && setPendingLoad(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir o documento atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Há {reviews.length} revisão(ões) registradas para “{doc?.name}”. Elas serão mantidas no histórico com a fonte original e aparecerão como invalidadas para o novo documento. Exporte o JSON antes, se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson}>Exportar JSON atual</Button>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const r = pendingLoad; setPendingLoad(null); if (r) runLoad(r); }}>Substituir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar trabalho salvo?</AlertDialogTitle>
            <AlertDialogDescription>O documento carregado e {reviews.length} revisão(ões) salvas neste navegador serão apagados. Exporte o JSON antes, se precisar do histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <Button variant="destructive" onClick={doClear}>Apagar e começar de novo</Button>
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
      <DialogContent className="w-[96vw] max-w-lg">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
