// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractFromPdf, extractFields, sha256Hex, BR01_SHA256, isPdfMagic } from './extract';
import { evaluate, buildSections, countStatus, incrementalDiff, fingerprint, reviewValid } from './rules';
import { Dec } from './decimal';
import type { ExtractionResult } from './types';

const PDF = path.resolve(__dirname, '../../../public/casos/BR01_parecer_capelinha.pdf');
// Referência de calibração (usada só para CONFERIR a extração, nunca para abastecê-la)
const GOLD: Record<string, [string, string, number]> = {
  quadro_lenha_nativa: ['1589.3531', 'm³', 3], quadro_madeira_nativa: ['730.2183', 'm³', 3],
  quadro_lenha_exotica: ['2.2143', 'm³', 3], quadro_madeira_exotica: ['83.3165', 'm³', 3],
  fragmentos_nativos: ['2059.4621', 'm³', 7], isoladas_nativas: ['167.8675', 'm³', 7], subtotal_nativo: ['2227.3296', 'm³', 7],
  area_destoca: ['9.1749', 'ha', 7], fator_destoca: ['10', 'm³/ha', 7], volume_destoca: ['91.7494', 'm³', 7],
  total_nativo: ['2319.079', 'm³', 7], texto_lenha_nativa: ['1589.3551', 'm³', 7], texto_madeira_nativa: ['730.2183', 'm³', 7],
  isoladas_total: ['252.3982', 'm³', 7], isoladas_exoticas_volume: ['84.5307', 'm³', 7], cedro_madeira: ['32.9174', 'm²', 7],
  exoticas_declaradas: ['125', 'indivíduos', 7], cedro_individuos: ['67', 'indivíduos', 7], eucalipto_individuos: ['58', 'indivíduos', 7],
  manga_individuos: ['7', 'indivíduos', 7], mogno_individuos: ['4', 'indivíduos', 7],
};

let ex: ExtractionResult;
beforeAll(async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes = new Uint8Array(fs.readFileSync(PDF));
  const sha = await sha256Hex(bytes);
  const doc = await pdfjs.getDocument({ data: bytes, verbosity: 0 }).promise;
  ex = await extractFromPdf(doc as any, sha);
}, 60000);

describe('BR01 — extração do PDF real', () => {
  it('hash e páginas', () => {
    expect(ex.sha256).toBe(BR01_SHA256);
    expect(ex.numPages).toBe(24);
    expect(ex.layout).toBe('BR01');
  });
  it('21 campos com valor, unidade original e página', () => {
    expect(Object.keys(ex.fields)).toHaveLength(21);
    for (const [k, [v, u, p]] of Object.entries(GOLD)) {
      const f = ex.fields[k];
      expect(f, k).toBeDefined();
      expect(Dec.parse(f.value).eq(Dec.parse(v)), k).toBe(true);
      expect(f.unit, k).toBe(u);
      expect(f.page, k).toBe(p);
      expect(f.bboxes.length, k).toBeGreaterThan(0);
    }
  });
  it('preserva outras ocorrências do mesmo número (fragmentos aparece duas vezes na p.7)', () => {
    expect(ex.fields.fragmentos_nativos.otherOccurrences.some((o) => o.page === 7)).toBe(true);
  });
  it('5 consistentes, 5 revisão, 0 não avaliáveis, deltas esperados', () => {
    const c = evaluate(ex.fields);
    expect(countStatus(c)).toEqual({ consistente: 5, revisao: 5, nao_avaliavel: 0 });
    const by = Object.fromEntries(c.map((x) => [x.id, x]));
    for (const id of ['R01', 'R02', 'R03', 'R07', 'R08']) expect(by[id].status).toBe('consistente');
    for (const id of ['R04', 'R05', 'R06', 'R09', 'R10']) expect(by[id].status).toBe('revisao');
    expect(by.R04.delta).toBe('0.4944');
    expect(by.R05.delta).toBe('0.4924');
    expect(by.R06.delta).toBe('-0.002');
    expect(by.R08.delta).toBe('-0.0004');
    expect(by.R09.calculated).toBe('136');
    expect(by.R09.reported).toBe('125');
    expect(by.R10.observedUnit).toBe('m²');
  });
  it('modo incremental: 4 preservados, 17 novos, 5 seções atualizadas', () => {
    const p3 = Object.fromEntries(Object.entries(ex.fields).filter(([, f]) => f.page === 3));
    expect(countStatus(evaluate(p3)).nao_avaliavel).toBe(10);
    const d = incrementalDiff(p3, ex.fields);
    expect(d.preserved).toHaveLength(4);
    expect(d.added).toHaveLength(17);
    expect(d.changedSections).toHaveLength(5);
  });
});

describe('negativos', () => {
  it('arquivo não PDF é rejeitado pela assinatura', () => {
    expect(isPdfMagic(new TextEncoder().encode('hello world'))).toBe(false);
  });
  it('PDF sem texto → OCR necessário, sem campos', () => {
    const r = extractFields([{ page: 1, text: '', items: [], width: 600, height: 800 }], 'x');
    expect(r.layout).toBe('ocr_necessario');
    expect(Object.keys(r.fields)).toHaveLength(0);
  });
  it('layout não suportado não recebe números de Capelinha', () => {
    const r = extractFields([{ page: 1, text: 'Relatório qualquer com 1.589,3531 m³ de algo.', items: [], width: 600, height: 800 }], 'abc');
    expect(r.layout).toBe('nao_reconhecido');
    expect(Object.keys(r.fields)).toHaveLength(0);
    expect(countStatus(evaluate(r.fields)).nao_avaliavel).toBe(10);
  });
  it('campos ausentes não aprovam', () => {
    const c = evaluate({});
    expect(c.every((x) => x.status === 'nao_avaliavel')).toBe(true);
    expect(buildSections({}, c).conclusao).toMatch(/não conclusivo/);
  });
  it('unidade incompatível bloqueia operação e a narrativa derivada', () => {
    const f = structuredClone(ex.fields);
    f.quadro_madeira_nativa.unit = 'ha';
    const c = evaluate(f);
    const r05 = c.find((x) => x.id === 'R05')!;
    expect(r05.reason).toBe('incompatible_units');
    expect(r05.calculated).toBeUndefined();
    expect(buildSections(f, c).quadro_quantitativo).toMatch(/Soma do quadro não calculada/);
  });
  it('alterar componente invalida subtotal, memória e revisão', () => {
    const base = evaluate(ex.fields);
    const rev = { id: '1', checkId: 'R01', kind: 'conferido' as const, note: 'ok', reviewer: 'X', date: '', fingerprint: fingerprint(ex.sha256, ex.fields, base[0].dependencies) };
    expect(reviewValid(rev, ex.sha256, ex.fields, base)).toBe(true);
    const f = structuredClone(ex.fields);
    f.fragmentos_nativos.value = Dec.parse(f.fragmentos_nativos.value).add(Dec.parse('1')).toString();
    const c = evaluate(f);
    expect(c.find((x) => x.id === 'R01')!.status).toBe('revisao');
    expect(buildSections(f, c).memoria_de_calculo).not.toBe(buildSections(ex.fields, base).memoria_de_calculo);
    expect(reviewValid(rev, ex.sha256, f, c)).toBe(false);
    expect(reviewValid(rev, 'outrohash', ex.fields, base)).toBe(false);
  });
  it('arredondamento de R08 não gera falso alerta', () => {
    expect(evaluate(ex.fields).find((x) => x.id === 'R08')!.status).toBe('consistente');
  });
  it('valores conflitantes preservados (lenha quadro ≠ texto; cedro em m²)', () => {
    expect(ex.fields.quadro_lenha_nativa.value).not.toBe(ex.fields.texto_lenha_nativa.value);
    expect(ex.fields.cedro_madeira.unit).toBe('m²');
  });
});

describe('minuta reflete a fonte atual', () => {
  it('documento não BR01: recorte "Documento completo", sem rótulo de caso público', async () => {
    const { buildMarkdown, buildJson, modeLabel } = await import('./minuta');
    expect(modeLabel('p3', false)).toBe('Documento completo');
    const fields = { total_nativo: { ...ex.fields.total_nativo, value: '1000' } };
    const checks = evaluate(fields);
    const m = { docName: 'meu.pdf', caseLabel: 'Documento do usuário: meu.pdf', sha256: 'abc', numPages: 1, mode: 'full' as const, isBR01: false, fields, checks, sections: buildSections(fields, checks), reviews: [], generatedAt: 'x' };
    const md = buildMarkdown(m);
    expect(md).toContain('Recorte: Documento completo');
    expect(md).not.toMatch(/Caso público|p\. 7/);
    expect(buildJson(m).fonte).toBe('Documento do usuário');
  });
  it('revisão de outro documento aparece com a fonte e invalidada', async () => {
    const { buildJson } = await import('./minuta');
    const checks = evaluate(ex.fields);
    const r = { id: '1', checkId: 'R01', kind: 'conferido' as const, note: '', reviewer: 'X', date: '', fingerprint: fingerprint('outro', ex.fields, checks[0].dependencies), docSha: 'outro', docName: 'velho.pdf' };
    const j = buildJson({ docName: 'BR01', caseLabel: 'BR01', sha256: ex.sha256, numPages: 24, mode: 'full', isBR01: true, fields: ex.fields, checks, sections: buildSections(ex.fields, checks), reviews: [r], generatedAt: 'x' });
    expect(j.revisoes[0].valid).toBe(false);
    expect(j.revisoes[0].fonte).toContain('velho.pdf');
  });
});
