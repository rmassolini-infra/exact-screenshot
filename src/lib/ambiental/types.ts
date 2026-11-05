export interface TextItemPos {
  str: string;
  start: number; // offset no texto normalizado da página
  end: number;
  x: number; y: number; w: number; h: number; // coordenadas PDF (origem inferior esquerda)
}

export interface PageText {
  page: number; // 1-based
  text: string;
  items: TextItemPos[];
  width: number;
  height: number;
}

export interface ExtractedField {
  key: string;
  label: string;
  raw: string;           // valor como impresso
  value: string;         // normalizado (ponto decimal)
  unit: string;          // unidade ORIGINAL da fonte
  page: number;
  section: string;
  method: 'native_table' | 'native_text_anchor';
  context: string;       // trecho que contém a âncora
  bboxes: [number, number, number, number][]; // x0,y0,x1,y1 em pontos PDF
  otherOccurrences: { page: number; context: string }[]; // mesmo número em outros pontos
}

export type LayoutStatus = 'BR01' | 'parcial' | 'nao_reconhecido' | 'ocr_necessario';

export interface ExtractionResult {
  sha256: string;
  numPages: number;
  pages: PageText[];
  fields: Record<string, ExtractedField>;
  layout: LayoutStatus;
  issues: string[]; // ambiguidades / ausências reais
}

export type CheckStatus = 'consistente' | 'revisao' | 'nao_avaliavel';

export interface CheckResult {
  id: string;
  label: string;
  op: 'sum' | 'difference' | 'identity' | 'multiply' | 'unit';
  inputs: string[];
  target: string | null;
  expectedUnit: string;
  tolerance: string;
  dependencies: string[];
  status: CheckStatus;
  missing: string[];
  reason?: 'incompatible_units' | 'out_of_tolerance' | 'unit_mismatch' | 'missing_inputs';
  calculated?: string;
  reported?: string;
  delta?: string;
  observedUnit?: string;
}

export interface Review {
  id: string;
  checkId: string;
  kind: 'conferido' | 'observacao';
  note: string;
  reviewer: string;
  date: string; // ISO
  fingerprint: string; // documento + entradas dependentes no momento da revisão
}
