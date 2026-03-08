import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Box, Zap, Clock, MessageSquare, FileDown, FolderOpen } from 'lucide-react';
import { useProject, useProjectAssets, useProjectInferencesGIE, useProjectInferencesATGI, useProjectPassivo, useAssetTimeline } from '@/hooks/useProjectData';
import { useProjectRealtime } from '@/hooks/useProjectRealtime';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import PipelineStatus from '@/components/PipelineStatus';
import InferenceGIECard from '@/components/InferenceGIECard';
import AssetTimeline from '@/components/AssetTimeline';
import AssetInventoryTab from '@/components/AssetInventoryTab';
import InferenceATGICard from '@/components/InferenceATGICard';
import OverviewTab from '@/components/OverviewTab';
import RagChat from '@/components/RagChat';
import ReportTab from '@/components/ReportTab';
import type { PipelineStep, GapSummary } from '@/types/grafter';

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: Eye },
  { id: 'assets', label: 'Inventário de Ativos', icon: Box },
  { id: 'gie', label: 'Inferências GIE', icon: Zap },
  { id: 'atgi', label: 'Timeline ATGI', icon: Clock },
  { id: 'chat', label: 'Chat RAG', icon: MessageSquare },
  { id: 'report', label: 'Relatório', icon: FileDown },
];

// Derive pipeline steps from project status
const derivePipelineSteps = (status: string | null): PipelineStep[] => {
  const steps: { id: string; label: string }[] = [
    { id: 'OCR', label: 'OCR Semântico' },
    { id: 'VAL', label: 'Valoração' },
    { id: 'GIE', label: 'Inferências GIE' },
    { id: 'ATGI', label: 'Timeline ATGI' },
    { id: 'READY', label: 'Relatório' },
  ];
  const statusOrder = ['uploading', 'ocr', 'valuation', 'gie', 'atgi', 'ready', 'complete'];
  const currentIdx = statusOrder.indexOf(status ?? 'uploading');

  return steps.map((s, i) => ({
    ...s,
    status: currentIdx > i + 1 || currentIdx >= statusOrder.length - 1
      ? 'done' as const
      : currentIdx === i + 1
      ? 'processing' as const
      : 'pending' as const,
  }));
};

// Derive gap summary from ATGI inferences
const deriveGapSummary = (atgi: any[]): GapSummary[] => {
  const groups: Record<string, { count: number; total: number }> = {};
  atgi.forEach((inf: any) => {
    const type = inf.gap_type ?? 'Sem Tipo';
    if (!groups[type]) groups[type] = { count: 0, total: 0 };
    groups[type].count++;
    groups[type].total += Math.abs(inf.value ?? 0);
  });
  return Object.entries(groups).map(([tipo, g]) => ({
    tipo,
    desc: `${g.count} inferência(s) tipo ${tipo}`,
    ativos: g.count,
    impacto: g.total,
    regulatory_ref: '—',
    severity: g.total > 10_000_000 ? 'critical' as const : g.total > 3_000_000 ? 'major' as const : 'minor' as const,
    remediation_estimate: '—',
  }));
};

const ProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Realtime subscription
  useProjectRealtime(id);

  // Supabase data
  const { data: project, isLoading: projectLoading } = useProject(id ?? '');
  const { data: assets } = useProjectAssets(id ?? '');
  const { data: inferencesGIE } = useProjectInferencesGIE(id ?? '');
  const { data: inferencesATGI } = useProjectInferencesATGI(id ?? '');
  const { data: passivo } = useProjectPassivo(id ?? '');
  const { data: timelineEvents } = useAssetTimeline(selectedAsset?.id);

  const safeAssets = assets ?? [];
  const safeGIE = inferencesGIE ?? [];
  const safeATGI = inferencesATGI ?? [];
  const safeTimeline = timelineEvents ?? [];

  const pipelineSteps = useMemo(() => derivePipelineSteps(project?.status ?? null), [project?.status]);
  const gapSummary = useMemo(() => deriveGapSummary(safeATGI), [safeATGI]);

  const kpis = useMemo(() => [
    { label: 'Precisão OCR', value: project?.kpi_ocr_precision ?? null, target: 95, met: (project?.kpi_ocr_precision ?? 0) >= 95 },
    { label: 'Redução tempo DD', value: project?.kpi_dd_reduction ?? null, target: 60, met: (project?.kpi_dd_reduction ?? 0) >= 60 },
    { label: 'Acurácia GIE', value: project?.kpi_gie_accuracy ?? null, target: 85, met: (project?.kpi_gie_accuracy ?? 0) >= 85 },
    { label: 'Cobertura Timeline', value: project?.kpi_atgi_coverage ?? null, target: 80, met: (project?.kpi_atgi_coverage ?? 0) >= 80 },
  ], [project]);

  const netImpactGIE = safeGIE.reduce((s: number, inf: any) => s + (inf.impact_value ?? 0), 0);

  if (projectLoading) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Carregando projeto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <button onClick={() => navigate('/dashboard')} className="text-primary mt-2 text-sm hover:underline">Voltar ao Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.target_company}</p>
        </div>
        <span className={`status-${project.status}`}>{(project.status ?? '').toUpperCase()}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px md:flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {activeTab === 'overview' && (
          <OverviewTab
            project={project}
            assets={safeAssets}
            inferencesGIE={safeGIE}
            inferencesATGI={safeATGI}
            passivo={passivo as any}
            pipelineSteps={pipelineSteps}
            kpis={kpis}
            gapSummary={gapSummary}
          />
        )}

        {activeTab === 'assets' && (
          <AssetInventoryTab
            assets={safeAssets}
            timelineEvents={safeTimeline}
            inferencesGIE={safeGIE}
            inferencesATGI={safeATGI}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
          />
        )}

        {activeTab === 'gie' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan" /> Grafter Inference Engine
                </h3>
                <p className="text-sm text-muted-foreground">{safeGIE.length} Inferências M&A · Sem acionamento manual</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Impacto financeiro total</p>
                <p className="font-mono font-bold text-red-brand">{formatCurrency(netImpactGIE)}</p>
              </div>
            </div>

            {safeGIE.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma inferência GIE gerada ainda. O pipeline precisa estar concluído.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {safeGIE.map((inf: any) => (
                    <InferenceGIECard key={inf.id} inference={inf} />
                  ))}
                </div>

                <div className="glass-panel-primary p-4">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Impacto Consolidado GIE</h4>
                  <div className="space-y-2">
                    {safeGIE.filter((i: any) => Math.abs(i.impact_value ?? 0) > 3000000).map((i: any) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{i.inference_id} {i.title}</span>
                        <span className={`font-mono ${(i.impact_value ?? 0) >= 0 ? 'text-green-brand' : 'text-red-brand'}`}>
                          {formatCurrency(i.impact_value ?? 0)}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 flex justify-between font-semibold">
                      <span>Net Impact GIE</span>
                      <span className="font-mono text-red-brand">{formatCurrency(netImpactGIE)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'atgi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-brand" /> Asset Timeline & Gap Intelligence
                </h3>
                <p className="text-sm text-muted-foreground">{safeATGI.length} Inferências Temporais · {gapSummary.length} Tipos de Gap</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Impacto total gaps</p>
                <p className="font-mono font-bold text-red-brand">{formatCurrency(gapSummary.reduce((s, g) => s + g.impacto, 0))}</p>
              </div>
            </div>

            {safeAssets.length > 0 && safeTimeline.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  Ativo: {safeAssets[0]?.codigo} — {safeAssets[0]?.fabricante} {safeAssets[0]?.modelo}
                </p>
                <AssetTimeline events={safeTimeline as any} />
              </div>
            )}

            {gapSummary.length > 0 && (
              <div className="glass-panel overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Tipo</th>
                      <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Descrição</th>
                      <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-center">Severidade</th>
                      <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Ativos</th>
                      <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapSummary.map(g => (
                      <tr key={g.tipo} className="border-b border-border/50">
                        <td className="px-4 py-2.5 font-mono text-red-brand text-xs">{g.tipo}</td>
                        <td className="px-4 py-2.5 text-xs">{g.desc}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            g.severity === 'critical' ? 'text-red-brand bg-red-brand/10 border-red-brand/20' :
                            g.severity === 'major' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                            'text-muted-foreground bg-muted/30 border-border'
                          }`}>{g.severity.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-xs">{g.ativos}</td>
                        <td className="px-4 py-2.5 font-mono text-right text-red-brand text-xs">{formatCurrency(g.impacto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {safeATGI.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma inferência ATGI gerada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {safeATGI.map((inf: any) => (
                  <InferenceATGICard key={inf.id} inference={inf} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && <RagChat projectId={id ?? ''} />}

        {activeTab === 'report' && (
          <ReportTab
            project={project}
            assets={safeAssets}
            inferencesGIE={safeGIE}
            inferencesATGI={safeATGI}
            passivo={passivo as any}
            kpis={kpis}
            gapSummary={gapSummary}
          />
        )}
      </motion.div>
    </div>
  );
};

export default ProjectPage;
