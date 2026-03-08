import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface OverviewChartsProps {
  assets: any[];
  inferencesGIE: any[];
  kpis: { label: string; value: number | null; target: number; met: boolean }[];
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'hsl(355, 82%, 56%)',
  HIGH: 'hsl(355, 82%, 66%)',
  MEDIUM: 'hsl(42, 100%, 51%)',
  LOW: 'hsl(160, 100%, 39%)',
};

const KPI_MET_COLOR = 'hsl(160, 100%, 39%)';
const KPI_PENDING_COLOR = 'hsl(42, 100%, 51%)';

const CustomTooltipKpi = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Valor: <span className="font-mono text-foreground">{payload[0].value}%</span></p>
      {payload[1] && <p className="text-muted-foreground">Meta: <span className="font-mono text-foreground">{payload[1].value}%</span></p>}
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} ativos</p>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Impacto: <span className="font-mono text-foreground">{formatCurrency(payload[0].value)}</span></p>
    </div>
  );
};

const OverviewCharts = ({ assets, inferencesGIE, kpis }: OverviewChartsProps) => {
  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    (assets as any[]).forEach(a => {
      const r = (a.risk_score ?? 'LOW').toUpperCase();
      counts[r] = (counts[r] ?? 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [assets]);

  const kpiChartData = useMemo(() =>
    kpis.filter(k => k.value !== null).map(k => ({
      name: k.label.replace('Precisão ', '').replace('Redução tempo ', '').replace('Acurácia ', '').replace('Cobertura ', ''),
      valor: k.value,
      meta: k.target,
      met: k.met,
    })),
    [kpis]
  );

  const gieImpactData = useMemo(() =>
    (inferencesGIE as any[])
      .filter(i => Math.abs(i.impact_value ?? 0) > 0)
      .sort((a, b) => (a.impact_value ?? 0) - (b.impact_value ?? 0))
      .map(i => ({
        name: i.inference_id,
        value: Math.abs(i.impact_value ?? 0),
        negative: (i.impact_value ?? 0) < 0,
        title: i.title,
      })),
    [inferencesGIE]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* KPIs Bar Chart */}
      <div className="glass-panel p-4">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">KPIs vs Meta</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={kpiChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltipKpi />} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {kpiChartData.map((entry, i) => (
                <Cell key={i} fill={entry.met ? KPI_MET_COLOR : KPI_PENDING_COLOR} fillOpacity={0.85} />
              ))}
            </Bar>
            <Bar dataKey="meta" radius={[4, 4, 0, 0]} maxBarSize={32} fill="hsl(216, 55%, 24%)" fillOpacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Distribution Pie */}
      <div className="glass-panel p-4">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Distribuição de Risco</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {riskDistribution.map((entry, i) => (
                <Cell key={i} fill={RISK_COLORS[entry.name] ?? RISK_COLORS.LOW} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltipPie />} />
            <Legend
              formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* GIE Impact Horizontal Bar */}
      <div className="glass-panel p-4 lg:col-span-2">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Impacto Financeiro GIE por Inferência</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, gieImpactData.length * 36)}>
          <BarChart data={gieImpactData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `R$ ${(v / 1_000_000).toFixed(0)}M`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltipBar />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {gieImpactData.map((entry, i) => (
                <Cell key={i} fill={entry.negative ? 'hsl(355, 82%, 56%)' : 'hsl(160, 100%, 39%)'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OverviewCharts;
