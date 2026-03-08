import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderOpen, Box, Zap, DollarSign, Plus, ArrowRight, Shield, TrendingDown,
  AlertTriangle, Activity, Clock, Search,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects, useGlobalStats } from '@/hooks/useProjectData';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';

const statusConfig: Record<string, { label: string; class: string; color: string }> = {
  uploading: { label: 'UPLOAD', class: 'status-complete', color: 'hsl(214, 30%, 65%)' },
  ingesting: { label: 'INGESTÃO', class: 'status-ingesting', color: 'hsl(263, 83%, 58%)' },
  processing: { label: 'PROCESSANDO', class: 'status-processing', color: 'hsl(42, 100%, 51%)' },
  ocr: { label: 'OCR', class: 'status-processing', color: 'hsl(42, 100%, 51%)' },
  valuation: { label: 'VALORAÇÃO', class: 'status-processing', color: 'hsl(42, 100%, 51%)' },
  gie: { label: 'GIE', class: 'status-processing', color: 'hsl(42, 100%, 51%)' },
  atgi: { label: 'ATGI', class: 'status-processing', color: 'hsl(42, 100%, 51%)' },
  ready: { label: 'READY', class: 'status-ready', color: 'hsl(193, 100%, 42%)' },
  complete: { label: 'COMPLETO', class: 'status-complete', color: 'hsl(160, 100%, 39%)' },
};

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const STATUS_COLORS: Record<string, string> = {
  uploading: 'hsl(214, 30%, 65%)',
  ingesting: 'hsl(263, 83%, 58%)',
  processing: 'hsl(42, 100%, 51%)',
  ocr: 'hsl(42, 100%, 51%)',
  valuation: 'hsl(42, 100%, 51%)',
  gie: 'hsl(42, 100%, 51%)',
  atgi: 'hsl(42, 100%, 51%)',
  ready: 'hsl(193, 100%, 42%)',
  complete: 'hsl(160, 100%, 39%)',
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: stats } = useGlobalStats();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const allProjects = projects ?? [];

  const filteredProjects = useMemo(() => {
    let result = allProjects as any[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        p.name?.toLowerCase().includes(q) || p.target_company?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((p: any) => p.status === statusFilter);
    return result;
  }, [allProjects, search, statusFilter]);

  const totalProjectCount = stats?.projectCount ?? 0;
  const totalAssets = stats?.assetCount ?? 0;
  const totalInferences = stats?.inferenceCount ?? 0;
  const totalPassivo = stats?.passivoTotal ?? 0;
  const totalSellerPrice = allProjects.reduce((s: number, p: any) => s + (p.seller_price ?? 0), 0);
  const totalAdjusted = allProjects.reduce((s: number, p: any) => s + (p.passivo_total_ajustado ?? 0), 0);
  const protectionPct = totalSellerPrice > 0 ? ((totalSellerPrice - totalAdjusted) / totalSellerPrice) * 100 : 0;

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    allProjects.forEach((p: any) => {
      const s = p.status ?? 'unknown';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allProjects]);

  const passivoByProject = useMemo(() =>
    allProjects
      .filter((p: any) => p.passivo_total_ajustado)
      .map((p: any) => ({
        name: p.name?.split(' ').slice(0, 2).join(' ') ?? 'Projeto',
        seller: p.seller_price ?? 0,
        adjusted: p.passivo_total_ajustado ?? 0,
        delta: (p.seller_price ?? 0) - (p.passivo_total_ajustado ?? 0),
      })),
    [allProjects]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { icon: FolderOpen, label: 'Projetos', value: totalProjectCount, sub: `${allProjects.filter((p: any) => p.status === 'ready' || p.status === 'complete').length} finalizados`, color: 'text-cyan' },
          { icon: Box, label: 'Ativos', value: totalAssets.toLocaleString('pt-BR'), sub: 'Catalogados & valorados', color: 'text-cyan' },
          { icon: Zap, label: 'Inferências', value: totalInferences, sub: 'GIE + ATGI geradas', color: 'text-amber-brand' },
          { icon: DollarSign, label: 'Preço Vendedor', value: totalSellerPrice > 0 ? formatCurrency(totalSellerPrice) : '—', sub: 'Base RAB declarada', color: 'text-foreground' },
          { icon: TrendingDown, label: 'Passivo Identificado', value: totalPassivo > 0 ? formatCurrency(totalPassivo) : '—', sub: 'Ajustes + ocultos + regulatório', color: 'text-red-brand' },
          { icon: Shield, label: 'Proteção', value: protectionPct > 0 ? `${formatPercent(protectionPct)}` : '—', sub: totalSellerPrice > 0 ? formatCurrency(totalSellerPrice - totalAdjusted) : 'Sem dados', color: 'text-green-brand' },
        ].map((m, i) => (
          <motion.div key={m.label} {...anim} transition={{ delay: i * 0.05 }} className="glass-panel p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
            </div>
            <p className={`font-mono text-lg font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row — only show if there are projects */}
      {allProjects.length > 0 && (
        <motion.div {...anim} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution */}
          <div className="glass-panel p-4">
            <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Pipeline — Status dos Projetos
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] ?? 'hsl(214, 30%, 65%)'} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-foreground">{statusConfig[payload[0].name]?.label ?? payload[0].name}</p>
                      <p className="text-muted-foreground">{payload[0].value} projetos</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center">
              {statusDistribution.map(s => (
                <button key={s.name} onClick={() => setStatusFilter(statusFilter === s.name ? null : s.name)}
                  className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded transition-all ${statusFilter === s.name ? 'ring-1 ring-primary' : ''}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.name] ?? 'hsl(214, 30%, 65%)' }} />
                  <span className="text-muted-foreground">{statusConfig[s.name]?.label ?? s.name} ({s.value})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Passivo Comparison — only if data exists */}
          {passivoByProject.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" /> Preço Vendedor vs. Preço Justo
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={passivoByProject} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 8 }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-foreground mb-1">{label}</p>
                        <p className="text-muted-foreground">Vendedor: <span className="font-mono text-foreground">{formatCurrency(payload[0]?.value ?? 0)}</span></p>
                        <p className="text-muted-foreground">Justo: <span className="font-mono text-green-brand">{formatCurrency(payload[1]?.value ?? 0)}</span></p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="seller" fill="hsl(214, 30%, 65%)" fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={28} name="Vendedor" />
                  <Bar dataKey="adjusted" fill="hsl(160, 100%, 39%)" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={28} name="Justo" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-1 text-[8px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-muted-foreground/40 inline-block" /> Preço vendedor</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-brand inline-block" /> Preço justo</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Projects Header */}
      <motion.div {...anim} transition={{ delay: 0.2 }} className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Projetos de Due Diligence</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto..." className="pl-8 h-8 text-xs w-48 bg-muted/30 border-border" />
          </div>
          {(statusFilter || search) && (
            <button onClick={() => { setStatusFilter(null); setSearch(''); }}
              className="text-[10px] text-primary hover:underline">Limpar</button>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{filteredProjects.length} projetos</span>
          <Button onClick={() => navigate('/projects/new')} size="sm" className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            Novo Projeto
          </Button>
        </div>
      </motion.div>

      {/* Projects Table */}
      {projectsLoading ? (
        <div className="glass-panel p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        </div>
      ) : (
        <motion.div {...anim} transition={{ delay: 0.25 }} className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Projeto</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Target</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Preço Vendedor</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Preço Justo</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Proteção</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Criado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((p: any, i: number) => {
                  const delta = (p.seller_price ?? 0) - (p.passivo_total_ajustado ?? 0);
                  const deltaPct = p.seller_price ? (delta / p.seller_price) * 100 : 0;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/10 cursor-pointer transition-colors"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-xs">{p.name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.target_company}</td>
                      <td className="px-4 py-3">
                        <span className={statusConfig[p.status]?.class ?? 'status-complete'}>
                          {statusConfig[p.status]?.label ?? p.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {p.seller_price ? formatCurrency(p.seller_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-green-brand">
                        {p.passivo_total_ajustado ? formatCurrency(p.passivo_total_ajustado) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.passivo_total_ajustado ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-[10px] text-green-brand">{formatCurrency(delta)}</span>
                            <span className="font-mono text-[8px] text-muted-foreground">-{formatPercent(deltaPct)}</span>
                          </div>
                        ) : <span className="text-[10px] text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[10px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      {search || statusFilter ? (
                        <p className="text-sm text-muted-foreground">Nenhum projeto encontrado com os filtros aplicados.</p>
                      ) : (
                        <div className="space-y-3">
                          <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                          <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
                          <Button onClick={() => navigate('/projects/new')} size="sm" className="gap-1.5">
                            <Plus className="w-3.5 h-3.5" /> Criar primeiro projeto
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Technical Footer */}
      <motion.div {...anim} transition={{ delay: 0.35 }} className="text-center">
        <p className="text-[8px] font-mono text-muted-foreground">
          Grafter Asset OS · P&D ANEEL PROPDI/PROPEE · Pipeline: OCR Semântico → RAG Indexação → Motor de Valoração → GIE → ATGI · CONFIDENCIAL
        </p>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
