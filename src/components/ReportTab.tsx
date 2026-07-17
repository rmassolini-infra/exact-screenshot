import { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  FileDown, FileText, FileSpreadsheet, FileCode, Shield, TrendingDown, Zap, Clock, AlertTriangle,
  CheckCircle2, Download, Eye, Printer, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import type { PassivoAjustado, GapSummary } from '@/types/grafter';
import { exportPdf } from '@/lib/exportPdf';
import { exportXlsx } from '@/lib/exportXlsx';
import { exportXml } from '@/lib/exportXml';
import { toast } from 'sonner';

interface ReportTabProps {
  project: any;
  assets: any[];
  inferencesGIE: any[];
  inferencesATGI: any[];
  passivo: PassivoAjustado | null;
  kpis: { label: string; value: number | null; target: number; met: boolean }[];
  gapSummary: GapSummary[];
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'hsl(355, 82%, 56%)',
  HIGH: 'hsl(355, 82%, 66%)',
  MEDIUM: 'hsl(42, 100%, 51%)',
  LOW: 'hsl(160, 100%, 39%)',
};

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

const ReportTab = ({ project, assets, inferencesGIE, inferencesATGI, passivo, kpis, gapSummary }: ReportTabProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true, passivo: true, assets: true, gie: true, atgi: true, kpis: true,
  });

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Stats
  const stats = useMemo(() => {
    const totalCapex = assets.reduce((s, a) => s + (a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0), 0);
    const totalValorAtual = assets.reduce((s, a) => s + (a.valor_atual ?? 0), 0);
    const riskDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    assets.forEach(a => { if (a.risk_score && riskDist[a.risk_score as keyof typeof riskDist] !== undefined) riskDist[a.risk_score as keyof typeof riskDist]++; });
    const netImpactGIE = inferencesGIE.reduce((s, i) => s + (i.impact_value ?? 0), 0);
    const totalGapImpact = gapSummary.reduce((s, g) => s + g.impacto, 0);
    return { totalCapex, totalValorAtual, riskDist, netImpactGIE, totalGapImpact };
  }, [assets, inferencesGIE, gapSummary]);

  const riskDistribution = useMemo(() =>
    Object.entries(stats.riskDist).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
    [stats.riskDist]);

  // Passivo waterfall chart
  const passivoWaterfall = useMemo(() => {
    if (!passivo) return [];
    return [
      { name: 'Preço Vendedor', value: passivo.seller_price, color: 'hsl(214, 30%, 65%)' },
      { name: 'Gap T1', value: passivo.ajuste_tipo1, color: 'hsl(355, 82%, 56%)' },
      { name: 'Gap T2', value: passivo.ajuste_tipo2, color: 'hsl(355, 82%, 60%)' },
      { name: 'Gap T3', value: passivo.ajuste_tipo3, color: 'hsl(355, 82%, 64%)' },
      { name: 'Gap T4', value: passivo.ajuste_tipo4, color: 'hsl(355, 82%, 68%)' },
      { name: 'Passivo GIE', value: passivo.passivo_oculto_gie, color: 'hsl(355, 82%, 72%)' },
      { name: 'Passivo Reg.', value: passivo.passivo_regulatorio, color: 'hsl(42, 100%, 51%)' },
      { name: 'Preço Justo', value: passivo.passivo_total_ajustado, color: 'hsl(160, 100%, 39%)' },
    ];
  }, [passivo]);

  const handleExportPdf = useCallback(() => {
    try {
      exportPdf({ project, assets, inferencesGIE, inferencesATGI, passivo, kpis, gapSummary });
      toast.success('PDF executivo gerado com sucesso!');
    } catch (e) { toast.error('Erro ao gerar PDF'); console.error(e); }
  }, [project, assets, inferencesGIE, inferencesATGI, passivo, kpis, gapSummary]);

  const handleExportXlsx = useCallback(() => {
    try {
      exportXlsx({ projectName: project?.name ?? 'projeto', assets, inferencesGIE, passivo, gapSummary });
      toast.success('XLSX exportado com sucesso!');
    } catch (e) { toast.error('Erro ao exportar XLSX'); console.error(e); }
  }, [project, assets, inferencesGIE, passivo, gapSummary]);

  const handleExportXml = useCallback(() => {
    try {
      exportXml({ project, assets, inferencesGIE, passivo, gapSummary });
      toast.success('XML SGPED/ANEEL exportado!');
    } catch (e) { toast.error('Erro ao exportar XML'); console.error(e); }
  }, [project, assets, inferencesGIE, passivo, gapSummary]);

  const SectionHeader = ({ id, icon: Icon, title, subtitle, badge }: { id: string; icon: any; title: string; subtitle?: string; badge?: string }) => (
    <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between py-3 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{title}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && <Badge variant="outline" className="text-[9px] font-mono">{badge}</Badge>}
      </div>
      {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Export Controls */}
      <motion.div {...anim} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" /> Relatório Executivo
          </h2>
          <p className="text-sm text-muted-foreground">ANEEL PROPDI/PROPEE · {project?.name} · {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleExportPdf} size="sm" className="gap-2">
            <FileText className="w-4 h-4" /> PDF Executivo
          </Button>
          <Button onClick={handleExportXml} variant="outline" size="sm" className="gap-2">
            <FileCode className="w-4 h-4" /> XML SGPED
          </Button>
          <Button onClick={handleExportXlsx} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> XLSX
          </Button>
        </div>
      </motion.div>

      {/* Report Body — print-ready layout */}
      <div className="space-y-4">

        {/* 1. Executive Summary — Sumário de Achados */}
        <motion.div {...anim} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="summary" icon={Shield} title="Sumário de Achados" subtitle="Contagem de achados, gaps e pendências" />
          {expandedSections.summary && (
            <div className="px-5 pb-5 space-y-4">
              {/* Empresa + Ativos */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Empresa-Alvo</p>
                  <p className="font-semibold text-sm">{project?.target_company}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Ativos analisados</p>
                  <p className="font-mono font-bold text-lg">{assets.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Achados GIE</p>
                  <p className="font-mono font-bold text-lg">{inferencesGIE.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Achados ATGI</p>
                  <p className="font-mono font-bold text-lg">{inferencesATGI.length}</p>
                </div>
              </div>

              {/* Achados por severidade */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Achados por severidade (GIE + ATGI)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => {
                    const gie = inferencesGIE.filter(i => (i.level ?? '').toUpperCase() === level).length;
                    const atgiMap: Record<string, string> = { CRITICAL: 'critical', HIGH: 'major', MEDIUM: 'minor', LOW: 'observation' };
                    const atgi = inferencesATGI.filter(i => (i.severity ?? '') === atgiMap[level]).length;
                    const total = gie + atgi;
                    const color =
                      level === 'CRITICAL' ? 'text-red-brand border-red-brand/30 bg-red-brand/5' :
                      level === 'HIGH' ? 'text-amber-brand border-amber-brand/30 bg-amber-brand/5' :
                      level === 'MEDIUM' ? 'text-cyan border-cyan/30 bg-cyan/5' :
                      'text-muted-foreground border-border bg-muted/20';
                    return (
                      <div key={level} className={`p-3 rounded-lg border ${color}`}>
                        <p className="text-[9px] font-mono uppercase tracking-wider opacity-80">{level}</p>
                        <p className="font-mono font-bold text-2xl">{total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gaps por tipo (1 a 4) */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Gaps por tipo (T1–T4)</p>
                <div className="grid grid-cols-4 gap-2">
                  {gapSummary.map(g => (
                    <div key={g.tipo} className="p-3 rounded-lg border border-border bg-muted/20">
                      <p className="text-[9px] font-mono text-muted-foreground uppercase">{g.tipo}</p>
                      <p className="font-mono font-bold text-lg">{g.ativos}</p>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">{g.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revisão humana + Cobertura */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-amber-brand/5 border border-amber-brand/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-brand" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes de revisão humana</p>
                  </div>
                  <p className="font-mono font-bold text-2xl text-amber-brand">
                    {inferencesGIE.filter((i: any) => i.validation_status === 'pending_review' || i.validation_status === 'requires_field_inspection').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cyan/5 border border-cyan/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-cyan" />
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cobertura documental média</p>
                  </div>
                  <p className="font-mono font-bold text-2xl text-cyan">
                    {formatPercent(assets.length ? assets.reduce((s, a) => s + (a.timeline_coverage_pct ?? 0), 0) / assets.length : 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 3. Asset Inventory Summary */}
        <motion.div {...anim} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="assets" icon={FileText} title="Inventário de Ativos" subtitle={`${assets.length} ativos analisados`} badge={formatCurrency(stats.totalCapex)} />
          {expandedSections.assets && (
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Risk distribution chart */}
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Distribuição de Risco</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                        {riskDistribution.map((entry, i) => <Cell key={i} fill={RISK_COLORS[entry.name] ?? RISK_COLORS.LOW} />)}
                      </Pie>
                      <Legend formatter={(v: string) => <span className="text-[9px] text-muted-foreground">{v}</span>} iconSize={6} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top risk assets */}
                <div className="lg:col-span-2 overflow-auto">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Ativos por Risco</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Código</th>
                        <th className="text-left py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Tipo</th>
                        <th className="text-left py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Fabricante</th>
                        <th className="text-right py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Valor Atual</th>
                        <th className="text-center py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Risco</th>
                        <th className="text-right py-1.5 px-2 text-[9px] text-muted-foreground uppercase">Δ Depr.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...assets].sort((a, b) => {
                        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                        return (order[a.risk_score as keyof typeof order] ?? 3) - (order[b.risk_score as keyof typeof order] ?? 3);
                      }).slice(0, 8).map(a => (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-muted/10">
                          <td className="py-1.5 px-2 font-mono text-primary">{a.codigo}</td>
                          <td className="py-1.5 px-2 capitalize">{a.tipo}</td>
                          <td className="py-1.5 px-2">{a.fabricante}</td>
                          <td className="py-1.5 px-2 font-mono text-right">{formatCurrency(a.valor_atual ?? 0)}</td>
                          <td className="py-1.5 px-2 text-center">
                            <span className={`${riskBadgeClass(a.risk_score ?? 'LOW')} !text-[8px]`}>{a.risk_score}</span>
                          </td>
                          <td className="py-1.5 px-2 font-mono text-right">
                            {(() => {
                              const d = (a.depreciacao_fisica_pct ?? 0) - (a.depreciacao_aneel_pct ?? 0);
                              return <span className={d > 5 ? 'text-red-brand' : d > 0 ? 'text-amber-brand' : 'text-green-brand'}>{d > 0 ? '+' : ''}{formatPercent(d)}</span>;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 4. GIE Inferences */}
        <motion.div {...anim} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="gie" icon={Zap} title="Inferências GIE — Grafter Inference Engine" subtitle={`${inferencesGIE.length} inferências`} />
          {expandedSections.gie && (
            <div className="px-5 pb-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">ID</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Título</th>
                    <th className="text-center py-2 px-2 text-[9px] text-muted-foreground uppercase">Nível</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Valor citado</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Confiança</th>
                    <th className="text-center py-2 px-2 text-[9px] text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(inferencesGIE as any[]).map((inf: any) => (
                    <tr key={inf.id} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="py-2 px-2 font-mono text-primary">{inf.inference_id}</td>
                      <td className="py-2 px-2 max-w-[300px]">
                        <p className="font-medium text-xs">{inf.title}</p>
                        {inf.finding && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{inf.finding}</p>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`${riskBadgeClass(inf.level)} !text-[8px]`}>{inf.level}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-right text-xs">{inf.impact_value ? formatCurrency(inf.impact_value) : <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-2 font-mono text-right">
                        {((inf.confidence_score ?? 0) * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                          inf.validation_status === 'validated' ? 'text-green-brand bg-green-brand/10 border-green-brand/20' :
                          inf.validation_status === 'requires_field_inspection' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                          'text-muted-foreground bg-muted/30 border-border'
                        }`}>
                          {inf.validation_status === 'validated' ? '✓ Validado' :
                           inf.validation_status === 'requires_field_inspection' ? '🔍 Campo' : '⏳ Revisão'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* 5. Gap Summary ATGI */}
        <motion.div {...anim} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="atgi" icon={Clock} title="Auditoria ATGI — Gaps Temporais" subtitle={`${gapSummary.length} tipos de gap · ${inferencesATGI.length} inferências`} />
          {expandedSections.atgi && (
            <div className="px-5 pb-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Descrição</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Base regulatória</th>
                    <th className="text-center py-2 px-2 text-[9px] text-muted-foreground uppercase">Severidade</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Ativos</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Remediação</th>
                  </tr>
                </thead>
                <tbody>
                  {gapSummary.map(g => (
                    <tr key={g.tipo} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="py-2 px-2 font-mono text-red-brand">{g.tipo}</td>
                      <td className="py-2 px-2">{g.desc}</td>
                      <td className="py-2 px-2 text-[10px] font-mono text-muted-foreground">Base regulatória: em consolidação</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                          g.severity === 'critical' ? 'text-red-brand bg-red-brand/10 border-red-brand/20' :
                          g.severity === 'major' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                          'text-muted-foreground bg-muted/30 border-border'
                        }`}>{g.severity.toUpperCase()}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-right">{g.ativos}</td>
                      <td className="py-2 px-2 text-[10px] text-right text-muted-foreground">{g.remediation_estimate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* 6. KPIs */}
        <motion.div {...anim} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="kpis" icon={Shield} title="Metas de KPI (a pactuar na Etapa 2)" subtitle="Valores ilustrativos com dados sintéticos" />
          {expandedSections.kpis && (
            <div className="px-5 pb-5">
              <div className="space-y-3">
                {kpis.map(kpi => (
                  <div key={kpi.label} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-40 shrink-0">{kpi.label}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden relative">
                      {kpi.value !== null && (
                        <div className="h-full rounded-full transition-all bg-amber-brand/70"
                          style={{ width: `${Math.min(kpi.value, 100)}%` }} />
                      )}
                      <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${kpi.target}%` }} />
                    </div>
                    <span className="font-mono text-xs font-bold w-14 text-right">{kpi.value !== null ? `${kpi.value}%` : '—'}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-amber-brand/10 text-amber-brand border border-amber-brand/20">SIMULADO</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-3">
                Metas contratuais: cobertura ≥ 98%, precisão ≥ 92%, redução de tempo ≥ 60%.
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div {...anim} transition={{ delay: 0.3 }} className="text-center py-4 space-y-2">
          <Separator />
          <p className="text-[10px] font-mono text-muted-foreground">
            Grafter Asset OS · P&D ANEEL PROPDI/PROPEE · CONFIDENCIAL
          </p>
          <p className="text-[9px] text-muted-foreground">
            Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} · 
            Projeto: {project?.name} · Empresa-alvo: {project?.target_company}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportTab;
