import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { Check, Loader2, Circle, Shield, TrendingDown, AlertTriangle, Activity, Zap, Clock, FileText, Target } from 'lucide-react';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import type { PipelineStep, PassivoAjustado, GapSummary } from '@/types/grafter';

interface OverviewTabProps {
  project: any;
  assets: any[];
  inferencesGIE: any[];
  inferencesATGI: any[];
  passivo: PassivoAjustado | null;
  pipelineSteps: PipelineStep[];
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

const OverviewTab = ({ project, assets, inferencesGIE, inferencesATGI, passivo, pipelineSteps, kpis, gapSummary }: OverviewTabProps) => {

  // ── Computed Stats ──
  const stats = useMemo(() => {
    const all = assets as any[];
    const totalCapex = all.reduce((s: number, a: any) => s + (a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0), 0);
    const totalValorAtual = all.reduce((s: number, a: any) => s + (a.valor_atual ?? 0), 0);
    const avgCoverage = all.length ? all.reduce((s: number, a: any) => s + (a.timeline_coverage_pct ?? 0), 0) / all.length : 0;
    const avgConformidade = all.length ? all.reduce((s: number, a: any) => s + ((a.conformidade_score ?? 0) * 100), 0) / all.length : 0;
    const riskDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    all.forEach((a: any) => { if (a.risk_score && riskDist[a.risk_score as keyof typeof riskDist] !== undefined) riskDist[a.risk_score as keyof typeof riskDist]++; });
    const netImpactGIE = (inferencesGIE as any[]).reduce((s: number, i: any) => s + (i.impact_value ?? 0), 0);
    const totalGapImpact = gapSummary.reduce((s, g) => s + g.impacto, 0);
    const criticalAssets = riskDist.CRITICAL + riskDist.HIGH;
    return { totalCapex, totalValorAtual, avgCoverage, avgConformidade, riskDist, netImpactGIE, totalGapImpact, criticalAssets, count: all.length };
  }, [assets, inferencesGIE, gapSummary]);

  // ── Chart Data ──
  const riskDistribution = useMemo(() =>
    Object.entries(stats.riskDist).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
    [stats.riskDist]);

  const kpiRadarData = useMemo(() =>
    kpis.filter(k => k.value !== null).map(k => ({
      metric: k.label.replace('Precisão ', '').replace('Redução tempo ', '').replace('Acurácia ', '').replace('Cobertura ', '').replace('ROI estimado ', ''),
      valor: k.value!,
      meta: k.target,
    })), [kpis]);

  const gieWaterfallData = useMemo(() => {
    const items = (inferencesGIE as any[])
      .filter(i => Math.abs(i.impact_value ?? 0) > 0)
      .sort((a, b) => (a.impact_value ?? 0) - (b.impact_value ?? 0))
      .map(i => ({ name: i.inference_id, value: i.impact_value ?? 0, title: i.title, level: i.level }));
    return items;
  }, [inferencesGIE]);

  const depreciationScatter = useMemo(() =>
    (assets as any[]).map((a: any) => ({
      name: a.codigo,
      aneel: a.depreciacao_aneel_pct ?? 0,
      fisica: a.depreciacao_fisica_pct ?? 0,
      valor: a.valor_atual ?? 0,
      risk: a.risk_score ?? 'LOW',
    })), [assets]);

  // (removido: waterfall de passivo)

  return (
    <div className="space-y-6">
      {/* ── Pipeline Status ── */}
      <motion.div {...anim} className="glass-panel-cyan p-4">
        <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Pipeline de Processamento — {pipelineSteps.filter(s => s.status === 'done').length}/{pipelineSteps.length} módulos
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto">
          {pipelineSteps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono ${
                step.status === 'done'
                  ? 'bg-green-brand/10 text-green-brand border border-green-brand/20'
                  : step.status === 'processing'
                  ? 'bg-amber-brand/10 text-amber-brand border border-amber-brand/20 animate-pulse'
                  : 'bg-muted/30 text-muted-foreground border border-border'
              }`}>
                {step.status === 'done' && <Check className="w-3 h-3" />}
                {step.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                {step.status === 'pending' && <Circle className="w-3 h-3" />}
                <span>{step.id}</span>
                <span className="hidden sm:inline">{step.label}</span>
                {step.duration && <span className="text-muted-foreground">{step.duration}</span>}
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className={`w-6 h-px ${step.status === 'done' ? 'bg-green-brand/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Executive Summary Cards ── */}
      <motion.div {...anim} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-cyan" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Ativos</span>
          </div>
          <p className="font-mono text-xl font-bold">{stats.count}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">CAPEX: {formatCurrency(stats.totalCapex)}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-green-brand" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Valor Atual</span>
          </div>
          <p className="font-mono text-xl font-bold text-green-brand">{formatCurrency(stats.totalValorAtual)}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Cobertura: {formatPercent(stats.avgCoverage)}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-red-brand" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Achados GIE</span>
          </div>
          <p className="font-mono text-xl font-bold">{inferencesGIE.length}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">inferências geradas</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-purple-brand" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Gaps ATGI</span>
          </div>
          <p className="font-mono text-xl font-bold">{gapSummary.length} tipos</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{inferencesATGI.length} inferências temporais</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-brand" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Risco Alto+</span>
          </div>
          <p className="font-mono text-xl font-bold text-amber-brand">{stats.criticalAssets}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{formatPercent(stats.count ? (stats.criticalAssets / stats.count) * 100 : 0)} do parque</p>
        </div>
      </motion.div>

      {/* ── KPIs with Radar + Progress Bars ── */}
      <motion.div {...anim} transition={{ delay: 0.1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI Radar */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Radar de Performance — KPIs vs Meta (Holdout WP4)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={kpiRadarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(216, 40%, 22%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }} />
              <Radar name="Meta" dataKey="meta" stroke="hsl(216, 55%, 24%)" fill="hsl(216, 55%, 24%)" fillOpacity={0.3} strokeWidth={1} />
              <Radar name="Valor" dataKey="valor" stroke="hsl(193, 100%, 42%)" fill="hsl(193, 100%, 42%)" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground mb-1">{payload[0]?.payload?.metric}</p>
                      {payload.map((p: any) => (
                        <p key={p.name} className="text-muted-foreground">{p.name}: <span className="font-mono text-foreground">{p.value}%</span></p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend formatter={(v: string) => <span className="text-[10px] text-muted-foreground">{v}</span>} iconSize={8} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* KPI Progress Bars */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> KPIs em Tempo Real — Validação Holdout WP4
          </h3>
          <div className="space-y-4">
            {kpis.map((kpi) => (
              <div key={kpi.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{kpi.value !== null ? `${kpi.value}%` : '—'}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      kpi.met ? 'bg-green-brand/10 text-green-brand border border-green-brand/20' : 'bg-amber-brand/10 text-amber-brand border border-amber-brand/20'
                    }`}>{kpi.met ? '✓ PASS' : '⏳ PENDING'}</span>
                  </div>
                </div>
                <div className="relative h-3 rounded-full bg-muted/30 overflow-hidden">
                  {kpi.value !== null && (
                    <div className={`h-full rounded-full transition-all ${kpi.met ? 'bg-green-brand' : 'bg-amber-brand'}`}
                      style={{ width: `${Math.min(kpi.value, 100)}%` }} />
                  )}
                  {/* Target marker */}
                  <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${kpi.target}%` }}>
                    <span className="absolute -top-4 -translate-x-1/2 text-[7px] font-mono text-muted-foreground">≥{kpi.target}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-muted-foreground font-mono mt-4">
            Validação: holdout 20% (WP4) · Threshold: MAE {'<'} 5% · MAPE {'<'} 8% · AUC-ROC {'>'} 0.85
          </p>
        </div>
      </motion.div>

      {/* ── Risk Distribution + Depreciation Scatter ── */}
      <motion.div {...anim} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Donut */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Distribuição de Risco — Random Forest (14 features)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLORS[entry.name] ?? RISK_COLORS.LOW} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-foreground">{payload[0].name}</p>
                    <p className="text-muted-foreground">{payload[0].value} ativos · {formatPercent((payload[0].value / stats.count) * 100)}</p>
                  </div>
                );
              }} />
              <Legend formatter={(v: string) => <span className="text-[10px] text-muted-foreground">{v}</span>} iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-[8px] text-muted-foreground font-mono">
            Features: coverage, gap_count, depr_delta, age_ratio, maintenance_freq, failure_history, capex_deviation, fabricante_concentration, regulatory_penalties, operational_incidents, spec_compliance, doc_quality, cross_ref_consistency, market_benchmark
          </p>
        </div>

        {/* Depreciation Comparison */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Depreciação ANEEL vs. Física — por Ativo</h3>
          <div className="space-y-1.5">
            {depreciationScatter.map(a => {
              const delta = a.fisica - a.aneel;
              return (
                <div key={a.name} className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-cyan w-20 shrink-0 truncate">{a.name}</span>
                  <div className="flex-1 relative h-4">
                    {/* ANEEL bar */}
                    <div className="absolute top-0 h-1.5 rounded-full bg-amber-brand/50" style={{ width: `${a.aneel}%` }} />
                    {/* Physical bar */}
                    <div className={`absolute bottom-0 h-1.5 rounded-full ${delta > 0 ? 'bg-red-brand/70' : 'bg-green-brand/70'}`}
                      style={{ width: `${a.fisica}%` }} />
                  </div>
                  <span className={`font-mono text-[9px] w-12 text-right ${delta > 5 ? 'text-red-brand' : delta > 0 ? 'text-amber-brand' : 'text-green-brand'}`}>
                    {delta > 0 ? '+' : ''}{formatPercent(delta)}
                  </span>
                  <span className={`${riskBadgeClass(a.risk)} !text-[7px]`}>{a.risk.slice(0, 4)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[8px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-sm bg-amber-brand/50 inline-block" /> ANEEL (REN 674)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-sm bg-red-brand/70 inline-block" /> Física (Weibull)</span>
          </div>
        </div>
      </motion.div>

      {/* ── GIE Impact Waterfall ── */}
      <motion.div {...anim} transition={{ delay: 0.2 }} className="glass-panel p-4">
        <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-cyan" /> Impacto Financeiro GIE — 8 Inferências M&A Proativas
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, gieWaterfallData.length * 38)}>
          <BarChart data={gieWaterfallData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }}
              axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(0)}M`}
            />
            <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              const item = gieWaterfallData.find(d => d.name === label);
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md max-w-xs">
                  <p className="font-mono text-cyan mb-1">{label}</p>
                  <p className="text-foreground text-[10px] mb-1">{item?.title}</p>
                  <p className="text-muted-foreground">Impacto: <span className={`font-mono ${(item?.value ?? 0) < 0 ? 'text-red-brand' : 'text-green-brand'}`}>
                    {formatCurrency(item?.value ?? 0)}
                  </span></p>
                </div>
              );
            }} />
            <ReferenceLine x={0} stroke="hsl(214, 30%, 65%)" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {gieWaterfallData.map((entry, i) => (
                <Cell key={i} fill={entry.value < 0 ? 'hsl(355, 82%, 56%)' : 'hsl(160, 100%, 39%)'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">Net Impact GIE Total</span>
          <span className="font-mono font-bold text-red-brand">{formatCurrency(stats.netImpactGIE)}</span>
        </div>
      </motion.div>

      {/* ── Passivo Total Ajustado ── */}
      {passivo && (
        <motion.div {...anim} transition={{ delay: 0.25 }} className="glass-panel-green p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💰</span>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider">Passivo Total Ajustado — Preço Justo de Aquisição</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waterfall Breakdown */}
            <div className="space-y-2">
              {[
                { label: 'Preço declarado (base RAB)', value: passivo.seller_price, positive: true },
                { label: '(-) Desvio instalação (ATGI T1)', value: -passivo.ajuste_tipo1, ref: 'REN 674 Art. 32' },
                { label: '(-) Manutenção não executada (T2)', value: -passivo.ajuste_tipo2, ref: 'MCPSE Mod. 12' },
                { label: '(-) Gaps regulatórios (T3)', value: -passivo.ajuste_tipo3, ref: 'REN 63/2004' },
                { label: '(-) Divergência contábil-real (T4)', value: -passivo.ajuste_tipo4, ref: 'CPC 27' },
                { label: '(-) Passivo Oculto GIE', value: -passivo.passivo_oculto_gie, ref: 'Cross-doc NLP' },
                { label: '(-) Passivo Regulatório', value: -passivo.passivo_regulatorio, ref: 'SIGEFIS/ANEEL' },
              ].map((l) => (
                <div key={l.label} className="flex items-center justify-between text-sm py-1 border-b border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{l.label}</span>
                    {(l as any).ref && <span className="text-[7px] font-mono text-muted-foreground/60">{(l as any).ref}</span>}
                  </div>
                  <span className={`font-mono text-xs ${l.positive ? 'text-foreground' : 'text-red-brand'}`}>
                    {formatCurrency(l.value)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <span className="font-semibold text-green-brand text-sm">= PREÇO JUSTO DE AQUISIÇÃO</span>
                <span className="text-2xl font-mono font-bold text-green-brand">{formatCurrency(passivo.passivo_total_ajustado)}</span>
              </div>
            </div>

            {/* Visual waterfall chart */}
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={passivoWaterfall} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 8 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="font-mono">{formatCurrency(payload[0].value)}</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {passivoWaterfall.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex justify-between text-sm p-3 rounded-lg bg-green-brand/10 border border-green-brand/20 mt-4">
            <span className="text-green-brand font-medium">Proteção financeira identificada pelo Grafter</span>
            <span className="font-mono font-bold text-green-brand">
              {formatCurrency(-passivo.delta_absoluto)} (-{passivo.delta_pct}%)
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Gap Summary Table ── */}
      <motion.div {...anim} transition={{ delay: 0.3 }} className="glass-panel overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-purple-brand" /> Resumo de Gaps ATGI — Impacto por Tipo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Tipo', 'Descrição', 'Base Regulatória', 'Severidade', 'Ativos', 'Impacto', 'Remediação'].map(h => (
                  <th key={h} className="px-4 py-2 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gapSummary.map(g => (
                <tr key={g.tipo} className="border-b border-border/50">
                  <td className="px-4 py-2 font-mono text-red-brand text-xs">{g.tipo}</td>
                  <td className="px-4 py-2 text-xs">{g.desc}</td>
                  <td className="px-4 py-2 text-[9px] font-mono text-muted-foreground">{g.regulatory_ref}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                      g.severity === 'critical' ? 'text-red-brand bg-red-brand/10 border-red-brand/20' :
                      g.severity === 'major' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                      'text-muted-foreground bg-muted/30 border-border'
                    }`}>{g.severity.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-right text-xs">{g.ativos}</td>
                  <td className="px-4 py-2 font-mono text-right text-red-brand text-xs">{formatCurrency(g.impacto)}</td>
                  <td className="px-4 py-2 text-[9px] text-right text-muted-foreground">{g.remediation_estimate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Technical Footer ── */}
      <motion.div {...anim} transition={{ delay: 0.35 }} className="text-center">
        <p className="text-[8px] font-mono text-muted-foreground">
          Grafter Asset OS · P&D ANEEL PROPDI/PROPEE · Modelos: Random Forest + Weibull + Monte Carlo + NLP (Gemini 2.5 Pro) · 
          Validação holdout WP4 (MAE: R$ 1.2M, MAPE: 5.1%, AUC-ROC: 0.87) · Base: 1.847 ativos setor elétrico 2015-2025 · CONFIDENCIAL
        </p>
      </motion.div>
    </div>
  );
};

export default OverviewTab;
