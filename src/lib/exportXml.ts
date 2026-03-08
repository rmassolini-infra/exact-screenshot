import { formatCurrency } from './format';

interface ExportXmlData {
  project: any;
  assets: any[];
  inferencesGIE: any[];
  passivo: any;
  gapSummary: { tipo: string; desc: string; ativos: number; impacto: number }[];
}

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportXml(data: ExportXmlData) {
  const p = data.project;
  const pa = data.passivo;
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<SGPED_ANEEL version="1.0" gerado_em="${today}">\n`;

  // Projeto
  xml += `  <Projeto>\n`;
  xml += `    <Nome>${escapeXml(p.name)}</Nome>\n`;
  xml += `    <EmpresaAlvo>${escapeXml(p.target_company)}</EmpresaAlvo>\n`;
  xml += `    <Status>${escapeXml(p.status ?? '')}</Status>\n`;
  xml += `    <DataGeracao>${today}</DataGeracao>\n`;
  xml += `  </Projeto>\n`;

  // Inventário
  xml += `  <Inventario quantidade="${data.assets.length}">\n`;
  for (const a of data.assets) {
    xml += `    <Ativo id="${escapeXml(a.id)}">\n`;
    xml += `      <Codigo>${escapeXml(a.codigo ?? '')}</Codigo>\n`;
    xml += `      <Tipo>${escapeXml(a.tipo ?? '')}</Tipo>\n`;
    xml += `      <Fabricante>${escapeXml(a.fabricante ?? '')}</Fabricante>\n`;
    xml += `      <Modelo>${escapeXml(a.modelo ?? '')}</Modelo>\n`;
    xml += `      <NumeroSerie>${escapeXml(a.numero_serie ?? '')}</NumeroSerie>\n`;
    xml += `      <DataAquisicao>${escapeXml(a.data_aquisicao ?? '')}</DataAquisicao>\n`;
    xml += `      <CapexOriginal>${a.capex_original ?? 0}</CapexOriginal>\n`;
    xml += `      <CapexCorrigidoIPCA>${a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0}</CapexCorrigidoIPCA>\n`;
    xml += `      <ValorAtual>${a.valor_atual ?? 0}</ValorAtual>\n`;
    xml += `      <VidaUtilContratada>${a.vida_util_contratada_anos ?? ''}</VidaUtilContratada>\n`;
    xml += `      <VidaUtilRestante>${a.vida_util_restante_anos ?? ''}</VidaUtilRestante>\n`;
    xml += `      <DepreciacaoANEEL>${a.depreciacao_aneel_pct ?? 0}</DepreciacaoANEEL>\n`;
    xml += `      <DepreciacaoFisica>${a.depreciacao_fisica_pct ?? 0}</DepreciacaoFisica>\n`;
    xml += `      <RiskScore>${escapeXml(a.risk_score ?? 'LOW')}</RiskScore>\n`;
    xml += `      <CoberturaTimeline>${a.timeline_coverage_pct ?? 0}</CoberturaTimeline>\n`;
    xml += `    </Ativo>\n`;
  }
  xml += `  </Inventario>\n`;

  // Inferências GIE
  xml += `  <InferenciasGIE quantidade="${data.inferencesGIE.length}">\n`;
  for (const i of data.inferencesGIE) {
    xml += `    <Inferencia id="${escapeXml(i.inference_id)}">\n`;
    xml += `      <Titulo>${escapeXml(i.title)}</Titulo>\n`;
    xml += `      <Nivel>${escapeXml(i.level)}</Nivel>\n`;
    xml += `      <ImpactoFinanceiro>${i.impact_value ?? 0}</ImpactoFinanceiro>\n`;
    xml += `      <Confianca>${((i.confidence_score ?? 0) * 100).toFixed(1)}</Confianca>\n`;
    xml += `      <Finding>${escapeXml(i.finding ?? '')}</Finding>\n`;
    xml += `      <Recomendacao>${escapeXml(i.recommendation ?? '')}</Recomendacao>\n`;
    xml += `    </Inferencia>\n`;
  }
  xml += `  </InferenciasGIE>\n`;

  // Gaps ATGI
  xml += `  <GapsATGI>\n`;
  for (const g of data.gapSummary) {
    xml += `    <Gap tipo="${escapeXml(g.tipo)}">\n`;
    xml += `      <Descricao>${escapeXml(g.desc)}</Descricao>\n`;
    xml += `      <AtivosAfetados>${g.ativos}</AtivosAfetados>\n`;
    xml += `      <ImpactoTotal>${g.impacto}</ImpactoTotal>\n`;
    xml += `    </Gap>\n`;
  }
  xml += `  </GapsATGI>\n`;

  // Passivo
  if (pa) {
    xml += `  <PassivoAjustado>\n`;
    xml += `    <PrecoVendedor>${pa.seller_price ?? 0}</PrecoVendedor>\n`;
    xml += `    <AjusteTipo1>${pa.ajuste_tipo1 ?? 0}</AjusteTipo1>\n`;
    xml += `    <AjusteTipo2>${pa.ajuste_tipo2 ?? 0}</AjusteTipo2>\n`;
    xml += `    <AjusteTipo3>${pa.ajuste_tipo3 ?? 0}</AjusteTipo3>\n`;
    xml += `    <AjusteTipo4>${pa.ajuste_tipo4 ?? 0}</AjusteTipo4>\n`;
    xml += `    <PassivoOcultoGIE>${pa.passivo_oculto_gie ?? 0}</PassivoOcultoGIE>\n`;
    xml += `    <PassivoRegulatorio>${pa.passivo_regulatorio ?? 0}</PassivoRegulatorio>\n`;
    xml += `    <PassivoTotalAjustado>${pa.passivo_total_ajustado ?? 0}</PassivoTotalAjustado>\n`;
    xml += `    <DeltaAbsoluto>${pa.delta_absoluto ?? 0}</DeltaAbsoluto>\n`;
    xml += `    <DeltaPct>${pa.delta_pct ?? 0}</DeltaPct>\n`;
    xml += `  </PassivoAjustado>\n`;
  }

  xml += `</SGPED_ANEEL>\n`;

  // Download
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sgped-aneel-${p.name?.replace(/\s+/g, '-').toLowerCase() ?? 'projeto'}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
