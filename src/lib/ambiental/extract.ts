import { Dec } from './decimal';
import type { ExtractedField, ExtractionResult, LayoutStatus, PageText, TextItemPos } from './types';

export const BR01_SHA256 = '43544837ef1aaa89581101964fb25b5542543cbf4130763e78784dd2dd1fc3a7';
export const BR01_META = {
  id: 'BR01',
  titulo: 'Caso público BR01 — Capelinha',
  processo: '2100.01.0049541/2020-38',
  empreendimento: 'LD Capelinha 2 — Malacacheta 2, 138 kV',
  orgao: 'IEF/MG',
  paginas: 24,
  urlOriginal: 'https://sistemas.meioambiente.mg.gov.br/reunioes/uploads/vq9CWtsUOmZslBUFj8FFOwDJ90IYX5BS.pdf',
  urlLocal: '/casos/BR01_parecer_capelinha.pdf',
};

/** Mínimo necessário de um documento pdf.js (permite testes em Node). */
export interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(o: { scale: number }): { width: number; height: number };
    getTextContent(): Promise<{ items: any[] }>;
  }>;
}

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const h = await crypto.subtle.digest('SHA-256', buf as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isPdfMagic(bytes: Uint8Array) {
  return bytes.length > 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

export async function readPages(doc: PdfDocLike, isCancelled?: () => boolean): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (isCancelled?.()) throw new Error('CANCELADO');
    const p = await doc.getPage(n);
    const vp = p.getViewport({ scale: 1 });
    const tc = await p.getTextContent();
    const items: TextItemPos[] = [];
    let text = '';
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      const s = it.str.replace(/\s+/g, ' ').trim();
      if (!s) continue;
      if (text) text += ' ';
      const start = text.length;
      text += s;
      items.push({ str: s, start, end: text.length, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]) });
    }
    pages.push({ page: n, text, items, width: vp.width, height: vp.height });
  }
  return pages;
}

/** Caixa delimitadora (aprox. proporcional aos caracteres) para um intervalo do texto. */
export function bboxFor(pt: PageText, start: number, end: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const it of pt.items) {
    if (it.end <= start || it.start >= end) continue;
    const len = it.end - it.start || 1;
    const a = Math.max(start, it.start) - it.start;
    const b = Math.min(end, it.end) - it.start;
    const x0 = it.x + (it.w * a) / len;
    const x1 = it.x + (it.w * b) / len;
    out.push([x0, it.y - it.h * 0.25, x1, it.y + it.h]);
  }
  return out;
}

const N = '([0-9]+(?:\\.[0-9]{3})*(?:,[0-9]+)?)';

interface Spec { key: string; label: string; pattern: RegExp; unit?: string; section: string; method: ExtractedField['method']; br01Page: number }

const Q = 'Quadro 8 — Produto/subproduto florestal autorizado';
const T = 'Narrativa volumétrica e árvores isoladas';
const tbl = (key: string, label: string, row: string): Spec => ({
  key, label, section: Q, method: 'native_table', br01Page: 3,
  pattern: new RegExp(row + '(?: Uso interno no imóvel ou| empreendimento)* ' + N + ' (m³|m²|m3|ha|st)(?![a-z/])'),
});
const txt = (key: string, label: string, p: string, unit?: string): Spec => ({
  key, label, section: T, method: 'native_text_anchor', br01Page: 7, unit,
  pattern: new RegExp(p.replace(/N/g, N)),
});

export const SPECS: Spec[] = [
  tbl('quadro_lenha_nativa', 'Quadro 8 · Lenha de floresta nativa', 'Lenha de floresta nativa'),
  tbl('quadro_madeira_nativa', 'Quadro 8 · Madeira de floresta nativa', 'Madeira de floresta nativa'),
  tbl('quadro_lenha_exotica', 'Quadro 8 · Lenha de floresta exótica', 'Lenha de floresta exótica'),
  tbl('quadro_madeira_exotica', 'Quadro 8 · Madeira de floresta exótica', 'Madeira de floresta exótica'),
  txt('fragmentos_nativos', 'Volume do inventário dos fragmentos de vegetação', 'inventário dos fragmentos de vegetação \\(N (m³)\\)'),
  txt('isoladas_nativas', 'Volume do censo das árvores isoladas (apenas nativas)', 'censo das árvores isoladas \\(apenas nativas\\) \\(N (m³)\\)'),
  txt('subtotal_nativo', 'Subtotal nativo (fragmentos + isoladas)', 'censo das árvores isoladas \\(apenas nativas\\) \\([^)]*\\) corresponde a N (m³)'),
  txt('area_destoca', 'Área de destoca', 'destoca ocorrerá em uma área N (ha)'),
  txt('fator_destoca', 'Fator de tocos e raízes', 'aplicando-se N (m³/ha)'),
  txt('volume_destoca', 'Volume de tocos e raízes', 'volume correspondente de tocos e raízes é igual a N (m³)'),
  txt('total_nativo', 'Total de produto florestal nativo', 'totalizando N (m³) de produto florestal nativo'),
  txt('texto_lenha_nativa', 'Narrativa · lenha nativa', 'Deste total, N (m³) corresponde a lenha nativa'),
  txt('texto_madeira_nativa', 'Narrativa · madeira nativa', 'corresponde a lenha nativa e N (m³) corresponde a madeira'),
  txt('isoladas_total', 'Volume total das árvores isoladas', 'O volume total corresponde a N (m³)'),
  txt('isoladas_exoticas_volume', 'Volume das isoladas exóticas', 'De acordo com o PIA, N (m³) trata-se de'),
  txt('cedro_madeira', 'Madeira de cedro australiano (isoladas exóticas)', 'sendo N ?(m[²³]) de madeira e'),
  txt('exoticas_declaradas', 'Árvores isoladas exóticas declaradas', 'Deste total, N árvores isoladas são exóticas', 'indivíduos'),
  txt('cedro_individuos', 'Indivíduos de cedro australiano', 'árvore exótica \\(N indivíduos de cedro australiano', 'indivíduos'),
  txt('eucalipto_individuos', 'Indivíduos de eucalipto', '\\( ?Toona ciliata ?\\), N indivíduos de eucalipto', 'indivíduos'),
  txt('manga_individuos', 'Indivíduos de manga', '\\( ?Eucalyptus sp\\. ?\\), N indivíduos de manga', 'indivíduos'),
  txt('mogno_individuos', 'Indivíduos de mogno africano', '\\( ?Mangifera indica ?\\) e N indivíduos de mogno', 'indivíduos'),
];

export const FIELD_LABELS: Record<string, string> = Object.fromEntries(SPECS.map((s) => [s.key, s.label]));

const ctx = (t: string, a: number, b: number, pad = 110) =>
  (a - pad > 0 ? '…' : '') + t.slice(Math.max(0, a - pad), Math.min(t.length, b + pad)) + (b + pad < t.length ? '…' : '');

/** Extrai campos do texto real das páginas. Para BR01 (hash confirmado) restringe às páginas conhecidas. */
export function extractFields(pages: PageText[], sha256: string): Omit<ExtractionResult, 'numPages' | 'pages'> {
  const isBR01 = sha256 === BR01_SHA256;
  const hasText = pages.some((p) => p.text.replace(/\s/g, '').length > 20);
  if (!hasText) return { sha256, fields: {}, layout: 'ocr_necessario', issues: ['Nenhuma camada de texto nativo encontrada — OCR necessário. Nenhum valor foi lido.'] };

  const fields: Record<string, ExtractedField> = {};
  const issues: string[] = [];
  for (const s of SPECS) {
    const cand = isBR01 ? pages.filter((p) => p.page === s.br01Page) : pages;
    const hits: { pt: PageText; m: RegExpExecArray }[] = [];
    for (const pt of cand) {
      const re = new RegExp(s.pattern.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(pt.text))) hits.push({ pt, m });
    }
    if (hits.length === 0) { issues.push(`${s.label}: âncora não encontrada.`); continue; }
    if (hits.length > 1) { issues.push(`${s.label}: ${hits.length} ocorrências da âncora — ambíguo, não extraído.`); continue; }
    const { pt, m } = hits[0];
    const raw = m[1];
    const unit = s.unit ?? m[2].replace('m3', 'm³');
    // posição exata do número dentro do match
    const rel = s.method === 'native_table' ? m[0].lastIndexOf(raw) : m[0].indexOf(raw);
    const a = m.index + rel, b = a + raw.length;
    let value: string;
    try { value = Dec.fromBR(raw).toString(); } catch { issues.push(`${s.label}: número "${raw}" não reconhecido.`); continue; }
    const other: { page: number; context: string }[] = [];
    for (const p2 of pages) {
      let i = -1;
      while ((i = p2.text.indexOf(raw, i + 1)) >= 0) {
        if (p2.page === pt.page && i === a) continue;
        const before = p2.text[i - 1], after = p2.text[i + raw.length];
        if ((before && /[\d.,]/.test(before)) || (after && /\d/.test(after))) continue;
        other.push({ page: p2.page, context: ctx(p2.text, i, i + raw.length, 70) });
      }
    }
    fields[s.key] = {
      key: s.key, label: s.label, raw, value, unit, page: pt.page, section: s.section, method: s.method,
      context: ctx(pt.text, m.index, m.index + m[0].length, 60), bboxes: bboxFor(pt, a, b), otherOccurrences: other,
    };
  }
  const n = Object.keys(fields).length;
  let layout: LayoutStatus = n === 0 ? 'nao_reconhecido' : isBR01 && n === SPECS.length ? 'BR01' : 'parcial';
  if (!isBR01 && n > 0) issues.unshift('Documento não identificado como BR01 (hash diferente). Layout não validado — todo campo exige revisão.');
  return { sha256, fields, layout, issues };
}

export async function extractFromPdf(doc: PdfDocLike, sha256: string, isCancelled?: () => boolean): Promise<ExtractionResult> {
  const pages = await readPages(doc, isCancelled);
  return { numPages: doc.numPages, pages, ...extractFields(pages, sha256) };
}
