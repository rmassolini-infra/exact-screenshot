import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Box, Zap, Clock, MessageSquare, FileDown, Search } from 'lucide-react';
import { useProject, useProjectAssets, useProjectInferencesGIE, useProjectInferencesATGI, useProjectPassivo, useAssetTimeline } from '@/hooks/useProjectData';
import { useProjectRealtime } from '@/hooks/useProjectRealtime';
import { mockProjects, mockAssets, mockInferencesGIE, mockInferencesATGI, mockPassivo, mockPipelineSteps, mockTimelineEvents, mockGapSummary } from '@/data/mockData';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import PipelineStatus from '@/components/PipelineStatus';
import PassivoCard from '@/components/PassivoCard';
import InferenceGIECard from '@/components/InferenceGIECard';
import AssetTimeline from '@/components/AssetTimeline';
import AssetDetailSheet from '@/components/AssetDetailSheet';
import AssetInventoryTab from '@/components/AssetInventoryTab';
import InferenceATGICard from '@/components/InferenceATGICard';
import OverviewCharts from '@/components/OverviewCharts';
import OverviewTab from '@/components/OverviewTab';
import RagChat from '@/components/RagChat';
import ReportTab from '@/components/ReportTab';
import { Input } from '@/components/ui/input';

const tabs = [
  { id: 'overview', label: 'Visão Geral', icon: Eye },
  { id: 'assets', label: 'Inventário de Ativos', icon: Box },
  { id: 'gie', label: 'Inferências GIE', icon: Zap },
  { id: 'atgi', label: 'Timeline ATGI', icon: Clock },
  { id: 'chat', label: 'Chat RAG', icon: MessageSquare },
  { id: 'report', label: 'Relatório', icon: FileDown },
];

const ProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Realtime subscription
  useProjectRealtime(id);

  // Supabase data
  const { data: dbProject } = useProject(id ?? '');
  const { data: dbAssets } = useProjectAssets(id ?? '');
  const { data: dbGIE } = useProjectInferencesGIE(id ?? '');
  const { data: dbATGI } = useProjectInferencesATGI(id ?? '');
  const { data: dbPassivo } = useProjectPassivo(id ?? '');
  const { data: dbTimeline } = useAssetTimeline(selectedAsset?.id);

  // Use mock data as fallback for demo projects
  const isMockProject = mockProjects.some(p => p.id === id);
  const project = dbProject ?? (isMockProject ? mockProjects.find(p => p.id === id) : null);
  const assets = (dbAssets && dbAssets.length > 0) ? dbAssets : (isMockProject ? mockAssets : []);
  const inferencesGIE = (dbGIE && dbGIE.length > 0) ? dbGIE : (isMockProject ? mockInferencesGIE : []);
  const inferencesATGI = (dbATGI && dbATGI.length > 0) ? dbATGI : (isMockProject ? mockInferencesATGI : []);
  const passivo = dbPassivo ?? (isMockProject ? mockPassivo : null);
  const timelineEvents = (dbTimeline && dbTimeline.length > 0) ? dbTimeline : (isMockProject ? mockTimelineEvents : []);

  const filteredAssets = (assets as any[]).filter((a: any) =>
    !assetSearch || a.codigo?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.fabricante?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.modelo?.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const kpis = [
    { label: 'Precisão OCR', value: (project as any)?.kpi_ocr_precision ?? 97.3, target: 95, met: true },
    { label: 'Redução tempo DD', value: (project as any)?.kpi_dd_reduction ?? 68, target: 60, met: true },
    { label: 'ROI estimado 24m', value: null, target: 150, met: false },
    { label: 'Acurácia GIE', value: (project as any)?.kpi_gie_accuracy ?? 87, target: 85, met: true },
    { label: 'Cobertura Timeline', value: (project as any)?.kpi_atgi_coverage ?? 82, target: 80, met: true },
  ];

  const gapSummary = mockGapSummary;

  const netImpactGIE = (inferencesGIE as any[]).reduce((s: number, inf: any) => s + (inf.impact_value ?? 0), 0);

  const handleExportPdf = useCallback(() => {
    try {
      exportPdf({ project, assets: assets as any[], inferencesGIE: inferencesGIE as any[], inferencesATGI: inferencesATGI as any[], passivo, kpis, gapSummary });
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      toast.error('Erro ao gerar PDF');
      console.error(e);
    }
  }, [project, assets, inferencesGIE, inferencesATGI, passivo, kpis, gapSummary]);

  const handleExportXlsx = useCallback(() => {
    try {
      exportXlsx({ projectName: (project as any)?.name ?? 'projeto', assets: assets as any[], inferencesGIE: inferencesGIE as any[], passivo, gapSummary });
      toast.success('XLSX exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar XLSX');
      console.error(e);
    }
  }, [project, assets, inferencesGIE, passivo, gapSummary]);

  const handleExportXml = useCallback(() => {
    try {
      exportXml({ project, assets: assets as any[], inferencesGIE: inferencesGIE as any[], passivo, gapSummary });
      toast.success('XML SGPED/ANEEL exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar XML');
      console.error(e);
    }
  }, [project, assets, inferencesGIE, passivo, gapSummary]);

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
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
          <h1 className="text-xl font-bold">{(project as any).name}</h1>
          <p className="text-sm text-muted-foreground">{(project as any).target_company}</p>
        </div>
        <span className={`status-${(project as any).status}`}>{((project as any).status ?? '').toUpperCase()}</span>
      </div>

      {/* Tabs - responsive */}
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
            assets={assets as any[]}
            inferencesGIE={inferencesGIE as any[]}
            inferencesATGI={inferencesATGI as any[]}
            passivo={passivo as any}
            pipelineSteps={mockPipelineSteps}
            kpis={kpis}
            gapSummary={gapSummary}
          />
        )}

        {activeTab === 'assets' && (
          <AssetInventoryTab
            assets={assets as any[]}
            timelineEvents={timelineEvents as any[]}
            inferencesGIE={inferencesGIE as any[]}
            inferencesATGI={inferencesATGI as any[]}
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
                <p className="text-sm text-muted-foreground">8 Inferências M&A Proativas · Sem acionamento manual</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Impacto financeiro total</p>
                <p className="font-mono font-bold text-red-brand">{formatCurrency(netImpactGIE)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(inferencesGIE as any[]).map((inf: any) => (
                <InferenceGIECard key={inf.id} inference={inf} />
              ))}
            </div>

            <div className="glass-panel-primary p-4">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Impacto Consolidado GIE</h4>
              <div className="space-y-2">
                {(inferencesGIE as any[]).filter((i: any) => Math.abs(i.impact_value ?? 0) > 3000000).map((i: any) => (
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
          </div>
        )}

        {activeTab === 'atgi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-brand" /> Asset Timeline & Gap Intelligence
                </h3>
                <p className="text-sm text-muted-foreground">6 Inferências Temporais · 4 Tipos de Gap · Base regulatória ANEEL</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Impacto total gaps</p>
                <p className="font-mono font-bold text-red-brand">{formatCurrency(gapSummary.reduce((s, g) => s + g.impacto, 0))}</p>
              </div>
            </div>

            {assets.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  Ativo: {(assets[0] as any)?.codigo} — {(assets[0] as any)?.fabricante} {(assets[0] as any)?.modelo}
                </p>
                <AssetTimeline events={timelineEvents as any} />
              </div>
            )}

            <div className="glass-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Descrição</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Base Regulatória</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-center">Severidade</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Ativos</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Impacto</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Remediação</th>
                  </tr>
                </thead>
                <tbody>
                  {gapSummary.map(g => (
                    <tr key={g.tipo} className="border-b border-border/50">
                      <td className="px-4 py-2.5 font-mono text-red-brand text-xs">{g.tipo}</td>
                      <td className="px-4 py-2.5 text-xs">{g.desc}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-muted-foreground">{g.regulatory_ref}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          g.severity === 'critical' ? 'text-red-brand bg-red-brand/10 border-red-brand/20' :
                          g.severity === 'major' ? 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' :
                          'text-muted-foreground bg-muted/30 border-border'
                        }`}>{g.severity.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right text-xs">{g.ativos}</td>
                      <td className="px-4 py-2.5 font-mono text-right text-red-brand text-xs">{formatCurrency(g.impacto)}</td>
                      <td className="px-4 py-2.5 text-[10px] text-right text-muted-foreground">{g.remediation_estimate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(inferencesATGI as any[]).map((inf: any) => (
                <InferenceATGICard key={inf.id} inference={inf} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && <RagChat projectId={id ?? ''} />}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="glass-panel-primary p-6 text-center">
              <FileDown className="w-12 h-12 text-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Relatório Executivo ANEEL PROPDI</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Gere o relatório completo com inventário, valoração, inferências GIE/ATGI e Passivo Total Ajustado.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <button onClick={handleExportPdf} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  📄 Gerar PDF Executivo
                </button>
                <button onClick={handleExportXml} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors border border-border">
                  🗂 Exportar XML SGPED/ANEEL
                </button>
                <button onClick={handleExportXlsx} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors border border-border">
                  📊 Exportar XLSX Inventário
                </button>
              </div>

              <div className="mt-8 text-left max-w-md mx-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Seções incluídas:</p>
                {[
                  `Inventário completo de ativos (${assets.length} ativos)`,
                  'Valoração financeira por ativo com memória de cálculo',
                  '8 Inferências GIE com fontes rastreadas',
                  'Auditoria ATGI: 4 tipos de gap + 6 inferências temporais',
                  'Passivo Total Ajustado com abertura de componentes',
                  'KPIs validados (holdout WP4)',
                  'Documentação para homologação ANEEL PROPDI',
                ].map(s => (
                  <div key={s} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="text-green-brand">✓</span>
                    <span className="text-muted-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-[10px] font-mono text-muted-foreground">
              Gerado por Grafter Asset OS · P&D ANEEL PROPDI/PROPEE · CONFIDENCIAL
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProjectPage;
