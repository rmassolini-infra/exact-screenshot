import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderOpen, Box, Zap, Plus, ArrowRight, AlertTriangle, Activity, Search, FileSearch, Users, FileCheck,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects, useGlobalStats } from '@/hooks/useProjectData';
import { formatPercent, riskBadgeClass } from '@/lib/format';
import { mockProjects } from '@/data/mockData';
import { useState } from 'react';

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

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'hsl(355, 82%, 56%)',
  HIGH: 'hsl(355, 82%, 66%)',
  MEDIUM: 'hsl(42, 100%, 51%)',
  LOW: 'hsl(160, 100%, 39%)',
};

const STATUS_COLORS: Record<string, string> = {
  ingesting: 'hsl(263, 83%, 58%)',
  processing: 'hsl(42, 100%, 51%)',
  ready: 'hsl(193, 100%, 42%)',
  complete: 'hsl(160, 100%, 39%)',
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: stats } = useGlobalStats();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const realProjects = projects ?? [];
  const allProjects = [...mockProjects, ...realProjects];

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

  const totalProjectCount = (stats?.projectCount ?? 0) + mockProjects.length;
  const totalAssets = (stats?.assetCount ?? 0) + 893;
  const totalInferences = (stats?.inferenceCount ?? 0) + 34;

  // Achados agregados por severidade
  const achadosAgg = useMemo(() => {
    const acc = { critical: 0, major: 0, minor: 0 };
    allProjects.forEach((p: any) => {
      acc.critical += p.achados_severity?.critical ?? 0;
      acc.major += p.achados_severity?.major ?? 0;
      acc.minor += p.achados_severity?.minor ?? 0;
    });
    return acc;
  }, [allProjects]);
  const totalAchados = achadosAgg.critical + achadosAgg.major + achadosAgg.minor;

  // Gaps agregados por tipo
  const gapsAgg = useMemo(() => {
    const acc = { tipo1: 0, tipo2: 0, tipo3: 0, tipo4: 0 };
    allProjects.forEach((p: any) => {
      acc.tipo1 += p.gaps_by_type?.tipo1 ?? 0;
      acc.tipo2 += p.gaps_by_type?.tipo2 ?? 0;
      acc.tipo3 += p.gaps_by_type?.tipo3 ?? 0;
      acc.tipo4 += p.gaps_by_type?.tipo4 ?? 0;
    });
    return acc;
  }, [allProjects]);
  const totalGaps = gapsAgg.tipo1 + gapsAgg.tipo2 + gapsAgg.tipo3 + gapsAgg.tipo4;

  const totalReviewPending = allProjects.reduce((s: number, p: any) => s + (p.human_review_pending ?? 0), 0);
  const projectsWithCoverage = allProjects.filter((p: any) => (p.cobertura_documental_pct ?? 0) > 0);
  const avgCoverage = projectsWithCoverage.length > 0
    ? projectsWithCoverage.reduce((s: number, p: any) => s + p.cobertura_documental_pct, 0) / projectsWithCoverage.length
    : 0;

  // Charts data
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    allProjects.forEach((p: any) => {
      const s = p.status ?? 'unknown';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allProjects]);

  const riskDistribution = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, '-': 0 };
    allProjects.forEach((p: any) => {
      const r = p.avg_risk ?? '-';
      counts[r as keyof typeof counts] = (counts[r as keyof typeof counts] ?? 0) + 1;
    });
    return Object.entries(counts).filter(([k, v]) => v > 0 && k !== '-').map(([name, value]) => ({ name, value }));
  }, [allProjects]);

  const severityData = [
    { name: 'Critical', value: achadosAgg.critical },
    { name: 'Major', value: achadosAgg.major },
    { name: 'Minor', value: achadosAgg.minor },
  ].filter(d => d.value > 0);

  const gapsData = [
    { name: 'Tipo 1', value: gapsAgg.tipo1 },
    { name: 'Tipo 2', value: gapsAgg.tipo2 },
    { name: 'Tipo 3', value: gapsAgg.tipo3 },
    { name: 'Tipo 4', value: gapsAgg.tipo4 },
  ];

  const SEV_COLORS: Record<string, string> = {
    Critical: 'hsl(355, 82%, 56%)',
    Major: 'hsl(42, 100%, 51%)',
    Minor: 'hsl(193, 100%, 42%)',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { icon: FolderOpen, label: 'Projetos', value: totalProjectCount, sub: `${allProjects.filter((p: any) => p.status === 'ready' || p.status === 'complete').length} finalizados`, color: 'text-cyan' },
          { icon: Box, label: 'Ativos', value: totalAssets.toLocaleString('pt-BR'), sub: 'Catalogados & valorados', color: 'text-cyan' },
          { icon: Zap, label: 'Inferências', value: totalInferences, sub: 'GIE + ATGI geradas', color: 'text-amber-brand' },
          { icon: AlertTriangle, label: 'Achados por Severidade', value: totalAchados, sub: `${achadosAgg.critical} crít · ${achadosAgg.major} maj · ${achadosAgg.minor} min`, color: 'text-red-brand' },
          { icon: FileSearch, label: 'Gaps por Tipo', value: totalGaps, sub: `T1 ${gapsAgg.tipo1} · T2 ${gapsAgg.tipo2} · T3 ${gapsAgg.tipo3} · T4 ${gapsAgg.tipo4}`, color: 'text-amber-brand' },
          { icon: Users, label: 'Revisão Humana Pendente', value: totalReviewPending, sub: 'Achados aguardando validação', color: 'text-foreground' },
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

      {/* Cobertura Documental Média — card destaque */}
      <motion.div {...anim} transition={{ delay: 0.1 }} className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-green-brand" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cobertura Documental Média do Portfólio</span>
          </div>
          <span className="font-mono text-sm font-bold text-green-brand">{formatPercent(avgCoverage)}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
          <div className="h-full bg-green-brand transition-all" style={{ width: `${Math.min(avgCoverage, 100)}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Média ponderada de cobertura documental (MCPSE Módulo 1) sobre {projectsWithCoverage.length} projetos com ingestão concluída.
        </p>
      </motion.div>

      {/* Charts Row */}
      <motion.div {...anim} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Achados por Severidade */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Achados por Severidade
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={SEV_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-foreground">{payload[0].name}</p>
                    <p className="text-muted-foreground">{payload[0].value} achados</p>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center">
            {severityData.map(s => (
              <span key={s.name} className="flex items-center gap-1 text-[9px]">
                <span className="w-2 h-2 rounded-full" style={{ background: SEV_COLORS[s.name] }} />
                <span className="text-muted-foreground">{s.name} ({s.value})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Gaps por Tipo */}
        <div className="glass-panel p-4">
          <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileSearch className="w-3 h-3" /> Gaps por Tipo (ATGI)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gapsData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 40%, 22%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(214, 30%, 65%)', fontSize: 8 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-foreground mb-1">{label}</p>
                    <p className="text-muted-foreground">Gaps: <span className="font-mono text-foreground">{payload[0]?.value ?? 0}</span></p>
                  </div>
                );
              }} />
              <Bar dataKey="value" fill="hsl(42, 100%, 51%)" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[8px] text-muted-foreground text-center mt-1">
            T1 Especificação · T2 Manutenção · T3 Regulatório · T4 Contábil-real
          </p>
        </div>
      </motion.div>


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
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-center">Ativos</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-center">Risco</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-center">Inferências</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Achados</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Gaps</th>
                  <th className="px-4 py-2.5 text-[9px] text-muted-foreground uppercase tracking-wider font-medium text-right">Cobertura</th>
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
                      <td className="px-4 py-3 text-center font-mono text-xs">{p.asset_count ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {p.avg_risk && p.avg_risk !== '-' ? (
                          <span className={riskBadgeClass(p.avg_risk)}>{p.avg_risk}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">{p.inference_count ?? '—'}</td>
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
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      {search || statusFilter ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto encontrado. Crie seu primeiro projeto de Due Diligence.'}
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
          Grafter DueDD · P&D ANEEL PROPDI/PROPEE · Pipeline: M-01 OCR Semântico → M-02 RAG Indexação → M-04 Inferências GIE → M-05 Pipeline ATGI · CONFIDENCIAL
        </p>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
