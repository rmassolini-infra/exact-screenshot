import { Dec, sumDec } from './decimal';
import type { CheckResult, ExtractedField, Review } from './types';

type Fields = Record<string, Pick<ExtractedField, 'value' | 'unit'> & Partial<ExtractedField>>;

export const RULES: [string, string, CheckResult['op'], string[], string | null, string, string][] = [
  ['R01', 'Fragmentos + isoladas nativas = subtotal nativo', 'sum', ['fragmentos_nativos', 'isoladas_nativas'], 'subtotal_nativo', 'm³', '0.00015'],
  ['R02', 'Subtotal + tocos e raízes = total nativo', 'sum', ['subtotal_nativo', 'volume_destoca'], 'total_nativo', 'm³', '0.00015'],
  ['R03', 'Isoladas totais − exóticas = isoladas nativas', 'difference', ['isoladas_total', 'isoladas_exoticas_volume'], 'isoladas_nativas', 'm³', '0.00015'],
  ['R04', 'Lenha + madeira (narrativa) = total nativo', 'sum', ['texto_lenha_nativa', 'texto_madeira_nativa'], 'total_nativo', 'm³', '0.00015'],
  ['R05', 'Lenha + madeira (Quadro 8) = total nativo', 'sum', ['quadro_lenha_nativa', 'quadro_madeira_nativa'], 'total_nativo', 'm³', '0.00015'],
  ['R06', 'Lenha nativa: quadro × narrativa', 'identity', ['quadro_lenha_nativa'], 'texto_lenha_nativa', 'm³', '0.00010'],
  ['R07', 'Madeira nativa: quadro × narrativa', 'identity', ['quadro_madeira_nativa'], 'texto_madeira_nativa', 'm³', '0.00010'],
  ['R08', 'Destoca: área × fator = volume', 'multiply', ['area_destoca', 'fator_destoca'], 'volume_destoca', 'm³', '0.00055'],
  ['R09', 'Soma das exóticas enumeradas = exóticas declaradas', 'sum', ['cedro_individuos', 'eucalipto_individuos', 'manga_individuos', 'mogno_individuos'], 'exoticas_declaradas', 'indivíduos', '0'],
  ['R10', 'Unidade do volume de madeira de cedro', 'unit', ['cedro_madeira'], null, 'm³', '0'],
];

export function evaluate(fields: Fields): CheckResult[] {
  return RULES.map(([id, label, op, inputs, target, expectedUnit, tolerance]) => {
    const deps = [...inputs, ...(target ? [target] : [])];
    const r: CheckResult = { id, label, op, inputs, target, expectedUnit, tolerance, dependencies: deps, status: 'nao_avaliavel', missing: deps.filter((k) => !fields[k]) };
    if (r.missing.length) return { ...r, reason: 'missing_inputs' };
    if (op === 'unit') {
      const u = fields[inputs[0]].unit;
      return { ...r, observedUnit: u, status: u === expectedUnit ? 'consistente' : 'revisao', reason: u === expectedUnit ? undefined : 'unit_mismatch' };
    }
    const units = op === 'multiply' ? ['ha', 'm³/ha', 'm³'] : deps.map(() => expectedUnit);
    if (deps.some((k, i) => fields[k].unit !== units[i])) return { ...r, status: 'revisao', reason: 'incompatible_units' };
    const v = inputs.map((k) => Dec.parse(fields[k].value));
    const calc = op === 'sum' ? sumDec(v) : op === 'difference' ? v[0].sub(v[1]) : op === 'identity' ? v[0] : v[0].mul(v[1]);
    const rep = Dec.parse(fields[target!].value);
    const delta = calc.sub(rep);
    const ok = delta.abs().cmp(Dec.parse(tolerance)) <= 0;
    return { ...r, calculated: calc.toString(), reported: rep.toString(), delta: delta.toString(), status: ok ? 'consistente' : 'revisao', reason: ok ? undefined : 'out_of_tolerance' };
  });
}

export const countStatus = (cs: CheckResult[]) => ({
  consistente: cs.filter((c) => c.status === 'consistente').length,
  revisao: cs.filter((c) => c.status === 'revisao').length,
  nao_avaliavel: cs.filter((c) => c.status === 'nao_avaliavel').length,
});

const br = (s: string, p = 4) => Dec.parse(s).toBR(p);

export const SECTION_TITLES: Record<string, string> = {
  quadro_quantitativo: 'Quadro quantitativo',
  memoria_de_calculo: 'Memória de cálculo',
  reconciliacao: 'Reconciliação',
  pendencias: 'Pendências',
  conclusao: 'Conclusão',
};

export function buildSections(fields: Fields, checks: CheckResult[]): Record<string, string> {
  const qk = ['quadro_lenha_nativa', 'quadro_madeira_nativa'];
  const qOk = qk.every((k) => fields[k] && fields[k].unit === 'm³');
  const tn = fields.total_nativo;
  const flags = checks.filter((c) => c.status === 'revisao').map((c) => c.id);
  const missing = checks.filter((c) => c.status === 'nao_avaliavel').map((c) => c.id);
  const memo = checks.map((c) =>
    c.status === 'nao_avaliavel' ? `${c.id}: não avaliável — ausentes: ${c.missing.join(', ')}.`
      : c.op === 'unit' ? `${c.id}: unidade observada "${c.observedUnit}", esperada "${c.expectedUnit}" → ${c.status === 'consistente' ? 'consistente' : 'revisão necessária'}.`
      : c.reason === 'incompatible_units' ? `${c.id}: unidades incompatíveis entre entradas — operação não executada.`
      : `${c.id}: calculado ${br(c.calculated!)} × informado ${br(c.reported!)} → Δ ${br(c.delta!)} (tol. ±${c.tolerance}) → ${c.status === 'consistente' ? 'consistente' : 'revisão necessária'}.`
  ).join('\n');
  return {
    quadro_quantitativo:
      (qOk ? `Soma dos dois produtos nativos do Quadro 8: ${sumDec(qk.map((k) => Dec.parse(fields[k].value))).toBR()} m³. ` : 'Soma do quadro não calculada: campos ausentes ou unidades incompatíveis. ') +
      'Total narrativo: ' + (tn && tn.unit === 'm³' ? `${br(tn.value)} m³.` : 'indisponível em unidade compatível.'),
    memoria_de_calculo: memo,
    reconciliacao: `${flags.length} verificações requerem revisão; ${missing.length} ainda não avaliáveis; ${checks.length - flags.length - missing.length} consistentes. São verificações relacionadas, não incidentes independentes.`,
    pendencias: (flags.length ? `Conferir divergências ${flags.join(', ')}. ` : '') + (missing.length ? `Incorporar evidência faltante (${missing.join(', ')}). ` : '') + 'Obter planilhas e estudos de origem; revisão ambiental independente.',
    conclusao: missing.length ? 'RECORTE INCOMPLETO — não conclusivo. Nenhuma aprovação automática.' : 'RECONCILIAÇÃO PENDENTE — não liberar conclusão automática. Conferência documental; não substitui PIA nem ato autorizativo do órgão.',
  };
}

/** Impressão digital estável das entradas de uma verificação (para invalidar revisões). */
export function fingerprint(sha: string, fields: Fields, deps: string[]): string {
  const s = sha + '|' + deps.map((k) => (fields[k] ? `${k}=${fields[k].value}${fields[k].unit}` : `${k}=∅`)).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function reviewValid(r: Review, sha: string, fields: Fields, checks: CheckResult[]) {
  // Proveniência obrigatória: registro legado (sem docSha/depsSnapshot) nunca é vigente.
  if (!r.docSha || !r.depsSnapshot || r.docSha !== sha) return false;
  const c = checks.find((x) => x.id === r.checkId);
  return !!c && r.fingerprint === fingerprint(sha, fields, c.dependencies);
}

export function incrementalDiff(before: Fields, after: Fields) {
  const cb = evaluate(before), ca = evaluate(after);
  const sb = buildSections(before, cb), sa = buildSections(after, ca);
  return {
    preserved: Object.keys(before).filter((k) => after[k] && after[k].value === before[k].value && after[k].unit === before[k].unit),
    added: Object.keys(after).filter((k) => !before[k]),
    changedSections: Object.keys(sa).filter((k) => sa[k] !== sb[k]),
  };
}
