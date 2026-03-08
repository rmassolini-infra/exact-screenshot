import * as XLSX from 'xlsx';

interface ExportXlsxData {
  projectName: string;
  assets: any[];
  inferencesGIE: any[];
  passivo: any;
  gapSummary: { tipo: string; desc: string; ativos: number; impacto: number }[];
}

export function exportXlsx(data: ExportXlsxData) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Inventário
  const assetsRows = data.assets.map(a => ({
    'Código': a.codigo ?? '',
    'Tipo': a.tipo ?? '',
    'Fabricante': a.fabricante ?? '',
    'Modelo': a.modelo ?? '',
    'Nº Série': a.numero_serie ?? '',
    'Data Aquisição': a.data_aquisicao ?? '',
    'CAPEX Original': a.capex_original ?? 0,
    'CAPEX Corrigido IPCA': a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0,
    'Valor Atual': a.valor_atual ?? 0,
    'Vida Útil Contratada (anos)': a.vida_util_contratada_anos ?? '',
    'Vida Útil Restante (anos)': a.vida_util_restante_anos ?? '',
    'Depr. ANEEL (%)': a.depreciacao_aneel_pct ?? 0,
    'Depr. Física (%)': a.depreciacao_fisica_pct ?? 0,
    'Risco': a.risk_score ?? 'LOW',
    'Cobertura Timeline (%)': a.timeline_coverage_pct ?? 0,
    'Conformidade': a.conformidade_score ?? '',
  }));
  const wsAssets = XLSX.utils.json_to_sheet(assetsRows);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Inventário');

  // Sheet 2: Inferências GIE
  const gieRows = data.inferencesGIE.map(i => ({
    'ID': i.inference_id,
    'Título': i.title,
    'Nível': i.level,
    'Impacto (R$)': i.impact_value ?? 0,
    'Confiança (%)': ((i.confidence_score ?? 0) * 100),
    'Finding': i.finding ?? '',
    'Recomendação': i.recommendation ?? '',
  }));
  const wsGIE = XLSX.utils.json_to_sheet(gieRows);
  XLSX.utils.book_append_sheet(wb, wsGIE, 'Inferências GIE');

  // Sheet 3: Gaps ATGI
  const gapRows = data.gapSummary.map(g => ({
    'Tipo': g.tipo,
    'Descrição': g.desc,
    'Ativos Afetados': g.ativos,
    'Impacto (R$)': g.impacto,
  }));
  const wsGaps = XLSX.utils.json_to_sheet(gapRows);
  XLSX.utils.book_append_sheet(wb, wsGaps, 'Gaps ATGI');

  // Sheet 4: Passivo
  if (data.passivo) {
    const p = data.passivo;
    const passivoRows = [
      { 'Componente': 'Preço do Vendedor', 'Valor (R$)': p.seller_price ?? 0 },
      { 'Componente': 'Ajuste Tipo 1', 'Valor (R$)': -(p.ajuste_tipo1 ?? 0) },
      { 'Componente': 'Ajuste Tipo 2', 'Valor (R$)': -(p.ajuste_tipo2 ?? 0) },
      { 'Componente': 'Ajuste Tipo 3', 'Valor (R$)': -(p.ajuste_tipo3 ?? 0) },
      { 'Componente': 'Ajuste Tipo 4', 'Valor (R$)': -(p.ajuste_tipo4 ?? 0) },
      { 'Componente': 'Passivo Oculto GIE', 'Valor (R$)': -(p.passivo_oculto_gie ?? 0) },
      { 'Componente': 'Passivo Regulatório', 'Valor (R$)': -(p.passivo_regulatorio ?? 0) },
      { 'Componente': 'PASSIVO TOTAL AJUSTADO', 'Valor (R$)': p.passivo_total_ajustado ?? 0 },
      { 'Componente': 'Delta Absoluto', 'Valor (R$)': p.delta_absoluto ?? 0 },
      { 'Componente': 'Delta (%)', 'Valor (R$)': p.delta_pct ?? 0 },
    ];
    const wsPassivo = XLSX.utils.json_to_sheet(passivoRows);
    XLSX.utils.book_append_sheet(wb, wsPassivo, 'Passivo Ajustado');
  }

  const filename = `inventario-${data.projectName?.replace(/\s+/g, '-').toLowerCase() ?? 'projeto'}.xlsx`;
  XLSX.writeFile(wb, filename);
}
