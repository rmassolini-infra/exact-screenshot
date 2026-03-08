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

        {/* 1. Executive Summary */}
        <motion.div {...anim} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="summary" icon={Shield} title="Sumário Executivo" subtitle="Visão consolidada do projeto" />
          {expandedSections.summary && (
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Empresa-Alvo</p>
                  <p className="font-semibold text-sm">{project?.target_company}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Ativos Analisados</p>
                  <p className="font-mono font-bold text-lg">{assets.length}</p>
                  <p className="text-[9px] text-muted-foreground">CAPEX: {formatCurrency(stats.totalCapex)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Preço Vendedor</p>
                  <p className="font-mono font-bold text-lg">{formatCurrency(project?.seller_price ?? 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Preço Justo</p>
                  <p className="font-mono font-bold text-lg text-green-brand">{formatCurrency(passivo?.passivo_total_ajustado ?? 0)}</p>
                  {passivo && (
                    <p className="text-[9px] text-green-brand font-mono">
                      Proteção: {formatCurrency(Math.abs(passivo.delta_absoluto))} ({formatPercent(Math.abs(passivo.delta_pct))})
                    </p>
                  )}
                </div>
              </div>

              {/* Risk summary row */}
              <div className="flex items-center gap-6 px-3 py-3 rounded-lg bg-muted/10 border border-border">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-brand" />
                  <div>
                    <p className="text-[9px] text-muted-foreground">Impacto GIE Total</p>
                    <p className="font-mono font-bold text-red-brand text-sm">{formatCurrency(stats.netImpactGIE)}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-brand" />
                  <div>
                    <p className="text-[9px] text-muted-foreground">Impacto Gaps ATGI</p>
                    <p className="font-mono font-bold text-red-brand text-sm">{formatCurrency(stats.totalGapImpact)}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-brand" />
                  <div>
                    <p className="text-[9px] text-muted-foreground">Ativos Alto Risco</p>
                    <p className="font-mono font-bold text-amber-brand text-sm">
                      {stats.riskDist.CRITICAL + stats.riskDist.HIGH} ({formatPercent(assets.length ? ((stats.riskDist.CRITICAL + stats.riskDist.HIGH) / assets.length) * 100 : 0)})
                    </p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-brand" />
                  <div>
                    <p className="text-[9px] text-muted-foreground">KPIs Atingidos</p>
                    <p className="font-mono font-bold text-green-brand text-sm">{kpis.filter(k => k.met).length}/{kpis.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 2. Passivo Total Ajustado */}
        {passivo && (
          <motion.div {...anim} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card overflow-hidden">
            <SectionHeader id="passivo" icon={TrendingDown} title="Passivo Total Ajustado" subtitle="Waterfall de ajustes e preço justo" badge={formatCurrency(passivo.passivo_total_ajustado)} />
            {expandedSections.passivo && (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Waterfall Chart */}
                  <div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={passivoWaterfall} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 8 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }} axisLine={false} tickLine={false}
                          tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(0)}M`} />
                        <Tooltip content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                              <p className="font-medium">{payload[0]?.payload?.name}</p>
                              <p className="font-mono">{formatCurrency(payload[0]?.value ?? 0)}</p>
                            </div>
                          );
                        }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {passivoWaterfall.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Line items */}
                  <div className="space-y-2">
                    {[
                      { label: 'Preço declarado (base RAB)', value: passivo.seller_price, positive: true },
                      { label: '(-) Desvio de instalação (ATGI T1)', value: -passivo.ajuste_tipo1 },
                      { label: '(-) Manutenção não executada (T2)', value: -passivo.ajuste_tipo2 },
                      { label: '(-) Gaps regulatórios (T3)', value: -passivo.ajuste_tipo3 },
                      { label: '(-) Divergência contábil-real (T4)', value: -passivo.ajuste_tipo4 },
                      { label: '(-) Passivo oculto GIE', value: -passivo.passivo_oculto_gie },
                      { label: '(-) Passivo regulatório', value: -passivo.passivo_regulatorio },
                    ].map(l => (
                      <div key={l.label} className="flex justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/20">
                        <span className="text-muted-foreground text-xs">{l.label}</span>
                        <span className={`font-mono text-xs ${l.positive ? 'text-foreground' : 'text-red-brand'}`}>
                          {formatCurrency(l.value)}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-baseline px-2 py-2">
                      <span className="font-semibold text-green-brand text-sm">= PREÇO JUSTO DE AQUISIÇÃO</span>
                      <span className="text-xl font-mono font-bold text-green-brand">{formatCurrency(passivo.passivo_total_ajustado)}</span>
                    </div>
                    <div className="flex justify-between text-sm px-3 py-2.5 rounded-lg bg-green-brand/10 border border-green-brand/20">
                      <span className="text-green-brand font-medium">Proteção financeira</span>
                      <span className="font-mono font-bold text-green-brand">
                        {formatCurrency(Math.abs(passivo.delta_absoluto))} (-{formatPercent(Math.abs(passivo.delta_pct))})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

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
          <SectionHeader id="gie" icon={Zap} title="Inferências GIE — Grafter Inference Engine" subtitle={`${inferencesGIE.length} inferências M&A proativas`} badge={formatCurrency(stats.netImpactGIE)} />
          {expandedSections.gie && (
            <div className="px-5 pb-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">ID</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Título</th>
                    <th className="text-center py-2 px-2 text-[9px] text-muted-foreground uppercase">Nível</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Impacto</th>
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
                      <td className="py-2 px-2 font-mono text-right text-red-brand">{formatCurrency(inf.impact_value ?? 0)}</td>
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
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={3} className="py-2 px-2 font-semibold text-xs">Net Impact GIE</td>
                    <td className="py-2 px-2 font-mono font-bold text-right text-red-brand">{formatCurrency(stats.netImpactGIE)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>

        {/* 5. Gap Summary ATGI */}
        <motion.div {...anim} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="atgi" icon={Clock} title="Auditoria ATGI — Gaps Temporais" subtitle={`${gapSummary.length} tipos de gap · ${inferencesATGI.length} inferências`} badge={formatCurrency(stats.totalGapImpact)} />
          {expandedSections.atgi && (
            <div className="px-5 pb-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Tipo</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Descrição</th>
                    <th className="text-left py-2 px-2 text-[9px] text-muted-foreground uppercase">Base Regulatória</th>
                    <th className="text-center py-2 px-2 text-[9px] text-muted-foreground uppercase">Severidade</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Ativos</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Impacto</th>
                    <th className="text-right py-2 px-2 text-[9px] text-muted-foreground uppercase">Remediação</th>
                  </tr>
                </thead>
                <tbody>
                  {gapSummary.map(g => (
                    <tr key={g.tipo} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="py-2 px-2 font-mono text-red-brand">{g.tipo}</td>
                      <td className="py-2 px-2">{g.desc}</td>
                      <td className="py-2 px-2 text-[10px] font-mono text-muted-foreground">{g.regulatory_ref}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                          g.severity === 'critical' ? 'text-red-brand bg-red-brand/10 border-red-brand/20' :
                          g.severity === 'major' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                          'text-muted-foreground bg-muted/30 border-border'
                        }`}>{g.severity.toUpperCase()}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-right">{g.ativos}</td>
                      <td className="py-2 px-2 font-mono text-right text-red-brand">{formatCurrency(g.impacto)}</td>
                      <td className="py-2 px-2 text-[10px] text-right text-muted-foreground">{g.remediation_estimate}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={5} className="py-2 px-2 font-semibold text-xs">Total Gaps ATGI</td>
                    <td className="py-2 px-2 font-mono font-bold text-right text-red-brand">{formatCurrency(stats.totalGapImpact)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>

        {/* 6. KPIs */}
        <motion.div {...anim} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader id="kpis" icon={Shield} title="KPIs de Validação" subtitle="Holdout WP4 — Threshold de aprovação" badge={`${kpis.filter(k => k.met).length}/${kpis.length} atingidos`} />
          {expandedSections.kpis && (
            <div className="px-5 pb-5">
              <div className="space-y-3">
                {kpis.map(kpi => (
                  <div key={kpi.label} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-40 shrink-0">{kpi.label}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden relative">
                      {kpi.value !== null && (
                        <div className={`h-full rounded-full transition-all ${kpi.met ? 'bg-green-brand' : 'bg-amber-brand'}`}
                          style={{ width: `${Math.min(kpi.value, 100)}%` }} />
                      )}
                      <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${kpi.target}%` }} />
                    </div>
                    <span className="font-mono text-xs font-bold w-14 text-right">{kpi.value !== null ? `${kpi.value}%` : '—'}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                      kpi.met ? 'bg-green-brand/10 text-green-brand border border-green-brand/20' : 'bg-amber-brand/10 text-amber-brand border border-amber-brand/20'
                    }`}>{kpi.met ? '✓ PASS' : '⏳'}</span>
                  </div>
                ))}
              </div>
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
