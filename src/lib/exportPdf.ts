import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent } from './format';

interface ExportData {
  project: any;
  assets: any[];
  inferencesGIE: any[];
  inferencesATGI: any[];
  passivo: any;
  kpis: { label: string; value: number | null; target: number; met: boolean }[];
  gapSummary: { tipo: string; desc: string; ativos: number; impacto: number }[];
}

export function exportPdf(data: ExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório Executivo ANEEL PROPDI', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Projeto: ${data.project.name}`, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Empresa-alvo: ${data.project.target_company}`, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, y, { align: 'center' });
  y += 12;

  // KPIs
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('KPIs em Tempo Real', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Valor', 'Meta', 'Status']],
    body: data.kpis.map(k => [
      k.label,
      k.value !== null ? `${k.value}%` : '—',
      `≥${k.target}%`,
      k.met ? '✓ Atingida' : '⏳ Pendente',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Passivo
  if (data.passivo) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Passivo Total Ajustado', 14, y);
    y += 2;

    const p = data.passivo;
    autoTable(doc, {
      startY: y,
      head: [['Componente', 'Valor']],
      body: [
        ['Preço do Vendedor', formatCurrency(p.seller_price ?? 0)],
        ['Ajuste Tipo 1 — Desvio de especificação', `- ${formatCurrency(p.ajuste_tipo1 ?? 0)}`],
        ['Ajuste Tipo 2 — Manutenção não executada', `- ${formatCurrency(p.ajuste_tipo2 ?? 0)}`],
        ['Ajuste Tipo 3 — Eventos sem resolução', `- ${formatCurrency(p.ajuste_tipo3 ?? 0)}`],
        ['Ajuste Tipo 4 — Divergência contábil-real', `- ${formatCurrency(p.ajuste_tipo4 ?? 0)}`],
        ['Passivo Oculto GIE', `- ${formatCurrency(p.passivo_oculto_gie ?? 0)}`],
        ['Passivo Regulatório', `- ${formatCurrency(p.passivo_regulatorio ?? 0)}`],
        ['PASSIVO TOTAL AJUSTADO', formatCurrency(p.passivo_total_ajustado ?? 0)],
        ['Delta', `${formatCurrency(p.delta_absoluto ?? 0)} (${(p.delta_pct ?? 0).toFixed(1)}%)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Assets table
  doc.addPage();
  y = 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Inventário de Ativos (${data.assets.length})`, 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Código', 'Tipo', 'Fabricante', 'Modelo', 'CAPEX Orig.', 'CAPEX Corrig.', 'Valor Atual', 'Risco']],
    body: data.assets.map(a => [
      a.codigo ?? '',
      a.tipo ?? '',
      a.fabricante ?? '',
      a.modelo ?? '',
      formatCurrency(a.capex_original ?? 0),
      formatCurrency(a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0),
      formatCurrency(a.valor_atual ?? 0),
      a.risk_score ?? 'LOW',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 7 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // GIE Inferences
  doc.addPage();
  y = 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Inferências GIE (${data.inferencesGIE.length})`, 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['ID', 'Título', 'Nível', 'Impacto', 'Confiança']],
    body: data.inferencesGIE.map(i => [
      i.inference_id,
      i.title,
      i.level,
      formatCurrency(i.impact_value ?? 0),
      `${((i.confidence_score ?? 0) * 100).toFixed(0)}%`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { cellWidth: 50 } },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Gap Summary
  if (y + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Impacto Consolidado — Gaps ATGI', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Tipo', 'Descrição', 'Ativos afetados', 'Impacto']],
    body: data.gapSummary.map(g => [
      g.tipo,
      g.desc,
      String(g.ativos),
      formatCurrency(g.impacto),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Grafter Asset OS · P&D ANEEL PROPDI/PROPEE · CONFIDENCIAL · Página ${i}/${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`relatorio-${data.project.name?.replace(/\s+/g, '-').toLowerCase() ?? 'projeto'}.pdf`);
}
