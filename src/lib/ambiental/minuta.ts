import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dec } from './decimal';
import { SECTION_TITLES, reviewValid } from './rules';
import type { CheckResult, ExtractedField, Review } from './types';

export interface MinutaInput {
  docName: string;
  caseLabel: string; // "BR01 — Capelinha" ou "Documento do usuário (não identificado)"
  sha256: string;
  numPages: number;
  mode: 'p3' | 'full';
  fields: Record<string, ExtractedField>;
  checks: CheckResult[];
  sections: Record<string, string>;
  reviews: Review[];
  generatedAt: string;
}

const STATUS = { consistente: 'Consistente', revisao: 'Revisão necessária', nao_avaliavel: 'Não avaliável' } as const;
const modeLabel = (m: string) => (m === 'p3' ? 'Somente quadro da p. 3' : 'Quadro + narrativa da p. 7 (incorporação de trechos do mesmo parecer)');
const fmt = (v: string) => Dec.parse(v).toBR(Math.min(4, (v.split('.')[1] ?? '').length));

export const DISCLAIMER = 'Minuta de conferência documental gerada por regras determinísticas. Não constitui aprovação, assinatura técnica, PIA nem licença/autorização ambiental. Nenhuma revisão técnica formal foi registrada por responsável habilitado.';

function reviewRows(m: MinutaInput) {
  return m.reviews.map((r) => ({ ...r, valid: reviewValid(r, m.sha256, m.fields, m.checks) }));
}

export function buildMarkdown(m: MinutaInput): string {
  const L: string[] = [];
  L.push(`# Minuta de conferência — ${m.caseLabel}`, '', `> ${DISCLAIMER}`, '');
  L.push(`- Documento: ${m.docName}`, `- SHA-256: \`${m.sha256}\``, `- Páginas: ${m.numPages}`, `- Recorte: ${modeLabel(m.mode)}`, `- Gerado em: ${m.generatedAt}`, '');
  L.push('## Campos extraídos', '', '| Campo | Valor original | Normalizado | Unidade (fonte) | Página |', '|---|---|---|---|---|');
  for (const f of Object.values(m.fields)) L.push(`| ${f.label} | ${f.raw} | ${f.value} | ${f.unit} | ${f.page} |`);
  L.push('');
  for (const k of Object.keys(SECTION_TITLES)) {
    L.push(`## ${SECTION_TITLES[k]}`, '');
    if (k === 'quadro_quantitativo') L.push(m.sections[k]);
    else if (k === 'memoria_de_calculo') m.sections[k].split('\n').forEach((l) => L.push(`- ${l}`));
    else if (k === 'reconciliacao') {
      L.push(m.sections[k], '', '| Regra | Descrição | Calculado | Informado | Δ | Tolerância | Estado |', '|---|---|---|---|---|---|---|');
      for (const c of m.checks) L.push(`| ${c.id} | ${c.label} | ${c.calculated ?? (c.observedUnit ? `unid. ${c.observedUnit}` : '—')} | ${c.reported ?? (c.op === 'unit' ? `esperada ${c.expectedUnit}` : '—')} | ${c.delta ?? '—'} | ±${c.tolerance} | ${STATUS[c.status]} |`);
    } else if (k === 'pendencias') {
      L.push(m.sections[k], '', '### Revisões locais registradas', '');
      const rr = reviewRows(m);
      if (!rr.length) L.push('Nenhuma revisão registrada.');
      rr.forEach((r) => L.push(`- ${r.checkId} · ${r.kind === 'conferido' ? 'Conferido' : 'Observação'} · ${r.reviewer} · ${r.date.slice(0, 10)} · ${r.valid ? 'vigente' : 'INVALIDADA (entrada/documento mudou)'} — ${r.note}`));
    } else L.push(m.sections[k]);
    L.push('');
  }
  return L.join('\n');
}

export function buildJson(m: MinutaInput) {
  return {
    escopo: 'Conferência documental — não é PIA completo, licença ou aprovação.',
    caso: m.caseLabel, documento: m.docName, sha256: m.sha256, paginas: m.numPages, recorte: m.mode, gerado_em: m.generatedAt,
    aprovacao_automatica: false, aprovacao_responsavel: null,
    evidencias: m.fields, regras: m.checks, secoes: m.sections, revisoes: reviewRows(m),
  };
}

export function buildPdf(m: MinutaInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 16;
  const para = (t: string, size = 9, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(t, W - 28);
    for (const l of lines) { if (y > 280) { doc.addPage(); y = 16; } doc.text(l, 14, y); y += size * 0.45; }
    y += 1.5;
  };
  para(`Minuta de conferência — ${m.caseLabel}`, 14, true);
  para(DISCLAIMER, 8);
  para(`Documento: ${m.docName}\nSHA-256: ${m.sha256}\nPáginas: ${m.numPages} · Recorte: ${modeLabel(m.mode)}\nGerado em: ${m.generatedAt}`, 8);
  const table = (head: string[], body: string[][]) => {
    autoTable(doc, { startY: y, head: [head], body, theme: 'grid', styles: { fontSize: 7 }, headStyles: { fillColor: [20, 36, 80] }, margin: { left: 14, right: 14 } });
    y = (doc as any).lastAutoTable.finalY + 6;
  };
  para('1. Quadro quantitativo', 11, true);
  para(m.sections.quadro_quantitativo);
  table(['Campo', 'Original', 'Unid.', 'Pág.'], Object.values(m.fields).map((f) => [f.label, f.raw, f.unit, String(f.page)]));
  para('2. Memória de cálculo', 11, true);
  para(m.sections.memoria_de_calculo, 8);
  para('3. Reconciliação', 11, true);
  para(m.sections.reconciliacao);
  table(['Regra', 'Calculado', 'Informado', 'Δ', 'Tol.', 'Estado'], m.checks.map((c) => [`${c.id} ${c.label}`, c.calculated ? fmt(c.calculated) : c.observedUnit ?? '—', c.reported ? fmt(c.reported) : c.op === 'unit' ? c.expectedUnit : '—', c.delta ?? '—', c.tolerance, STATUS[c.status]]));
  para('4. Pendências', 11, true);
  para(m.sections.pendencias);
  const rr = reviewRows(m);
  if (rr.length) table(['Regra', 'Tipo', 'Responsável informado', 'Data', 'Situação', 'Observação'], rr.map((r) => [r.checkId, r.kind === 'conferido' ? 'Conferido' : 'Observação', r.reviewer, r.date.slice(0, 10), r.valid ? 'vigente' : 'invalidada', r.note]));
  else para('Nenhuma revisão local registrada.', 8);
  para('5. Conclusão', 11, true);
  para(m.sections.conclusao, 9, true);
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7); doc.text(`Grafter DueDD Ambiental · caso público · revisão técnica pendente · ${i}/${n}`, W / 2, 290, { align: 'center' }); }
  return doc;
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
