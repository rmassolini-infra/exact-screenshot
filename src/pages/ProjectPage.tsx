import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Box, Zap, Clock, MessageSquare, FileDown, Search } from 'lucide-react';
import { mockProjects, mockAssets, mockInferencesGIE, mockInferencesATGI, mockPassivo, mockPipelineSteps, mockTimelineEvents } from '@/data/mockData';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import PipelineStatus from '@/components/PipelineStatus';
import PassivoCard from '@/components/PassivoCard';
import InferenceGIECard from '@/components/InferenceGIECard';
import AssetTimeline from '@/components/AssetTimeline';
import RagChat from '@/components/RagChat';
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

  const project = mockProjects.find(p => p.id === id) || mockProjects[0];
  const assets = mockAssets.filter(a => a.project_id === project.id);
  const filteredAssets = assets.filter(a =>
    !assetSearch || a.codigo.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.fabricante.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.modelo.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const kpis = [
    { label: 'Precisão OCR', value: 97.3, target: 95, met: true },
    { label: 'Redução tempo DD', value: 68, target: 60, met: true },
    { label: 'ROI estimado 24m', value: null, target: 150, met: false },
    { label: 'Acurácia GIE', value: 87, target: 85, met: true },
    { label: 'Cobertura Timeline', value: 82, target: 80, met: true },
  ];

  const gapSummary = [
    { tipo: 'TIPO 1', desc: 'Desvio de especificação', ativos: 4, impacto: -42000000 },
    { tipo: 'TIPO 2', desc: 'Manutenção não executada', ativos: 12, impacto: -18000000 },
    { tipo: 'TIPO 3', desc: 'Eventos sem resolução', ativos: 3, impacto: -8500000 },
    { tipo: 'TIPO 4', desc: 'Divergência contábil-real', ativos: 8, impacto: -19000000 },
  ];

  const netImpactGIE = mockInferencesGIE.reduce((s, inf) => s + inf.impact_value, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.target_company}</p>
        </div>
        <span className={`status-${project.status}`}>{project.status.toUpperCase()}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
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
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PipelineStatus steps={mockPipelineSteps} />

            {/* KPIs */}
            <div className="glass-panel p-4">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">KPIs em Tempo Real</h3>
              <div className="space-y-3">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-44 shrink-0">{kpi.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30">
                      {kpi.value !== null && (
                        <div
                          className={`h-full rounded-full ${kpi.met ? 'bg-green-brand' : 'bg-amber-brand'}`}
                          style={{ width: `${Math.min(kpi.value, 100)}%` }}
                        />
                      )}
                    </div>
                    <span className="font-mono text-sm w-16 text-right">
                      {kpi.value !== null ? `${kpi.value}%` : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground w-20">meta: ≥{kpi.target}%</span>
                    <span className="text-sm w-6">{kpi.met ? '✓' : '⏳'}</span>
                  </div>
                ))}
              </div>
            </div>

            <PassivoCard passivo={mockPassivo} />
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Buscar por código, fabricante, modelo..."
                  className="pl-9 bg-muted/30 border-border"
                />
              </div>
              <span className="text-sm text-muted-foreground font-mono">{filteredAssets.length} ativos</span>
            </div>

            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {['Código', 'Tipo', 'Fabricante', 'Modelo', 'CAPEX Original', 'CAPEX Corrigido', 'Valor Atual', 'Depr. ANEEL', 'Depr. Física', 'Risco', 'Timeline'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/10 cursor-pointer transition-colors">
                        <td className="px-3 py-2.5 font-mono text-cyan text-xs">{a.codigo}</td>
                        <td className="px-3 py-2.5 text-xs capitalize">{a.tipo}</td>
                        <td className="px-3 py-2.5 text-xs">{a.fabricante}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.modelo}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-right">{formatCurrency(a.capex_original)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-right">{formatCurrency(a.capex_corrigido)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-right font-medium">{formatCurrency(a.valor_atual)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted/30">
                              <div className="h-full rounded-full bg-amber-brand" style={{ width: `${a.depreciacao_aneel_pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{formatPercent(a.depreciacao_aneel_pct)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted/30">
                              <div className={`h-full rounded-full ${a.depreciacao_fisica_pct > a.depreciacao_aneel_pct ? 'bg-red-brand' : 'bg-green-brand'}`} style={{ width: `${a.depreciacao_fisica_pct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{formatPercent(a.depreciacao_fisica_pct)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5"><span className={riskBadgeClass(a.risk_score)}>{a.risk_score}</span></td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-mono ${a.timeline_coverage_pct >= 80 ? 'text-green-brand' : a.timeline_coverage_pct >= 60 ? 'text-amber-brand' : 'text-red-brand'}`}>
                            {formatPercent(a.timeline_coverage_pct)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gie' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan" /> Grafter Inference Engine
                </h3>
                <p className="text-sm text-muted-foreground">8 Inferências M&A Proativas</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total de impacto financeiro</p>
                <p className="font-mono font-bold text-red-brand">{formatCurrency(netImpactGIE)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockInferencesGIE.map((inf) => (
                <InferenceGIECard key={inf.id} inference={inf} />
              ))}
            </div>

            {/* Impact summary */}
            <div className="glass-panel-primary p-4">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Impacto Consolidado GIE</h4>
              <div className="space-y-2">
                {mockInferencesGIE.filter(i => Math.abs(i.impact_value) > 3000000).map(i => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{i.inference_id} {i.title}</span>
                    <span className={`font-mono ${i.impact_value >= 0 ? 'text-green-brand' : 'text-red-brand'}`}>
                      {formatCurrency(i.impact_value)}
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
                <p className="text-sm text-muted-foreground">Cobertura: 82% (≥80% ✓)</p>
              </div>
            </div>

            {/* Timeline for first asset */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-mono">Ativo: {mockAssets[0]?.codigo} — {mockAssets[0]?.fabricante} {mockAssets[0]?.modelo}</p>
              <AssetTimeline events={mockTimelineEvents} />
            </div>

            {/* Gap table */}
            <div className="glass-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Tipo</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-left">Descrição</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Ativos afetados</th>
                    <th className="px-4 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium text-right">Impacto total</th>
                  </tr>
                </thead>
                <tbody>
                  {gapSummary.map(g => (
                    <tr key={g.tipo} className="border-b border-border/50">
                      <td className="px-4 py-2.5 font-mono text-red-brand text-xs">{g.tipo}</td>
                      <td className="px-4 py-2.5">{g.desc}</td>
                      <td className="px-4 py-2.5 font-mono text-right">{g.ativos}</td>
                      <td className="px-4 py-2.5 font-mono text-right text-red-brand">{formatCurrency(g.impacto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ATGI Inferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockInferencesATGI.map(inf => (
                <div key={inf.id} className="glass-panel-purple p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-purple-brand">{inf.inference_id}</span>
                  </div>
                  <h4 className="text-sm font-semibold mb-2">{inf.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{inf.finding}</p>
                  {inf.gap_type && (
                    <span className="mt-2 inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-red-brand/10 text-red-brand border border-red-brand/20">
                      {inf.gap_type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && <RagChat />}

        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="glass-panel-primary p-6 text-center">
              <FileDown className="w-12 h-12 text-cyan mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Relatório Executivo ANEEL PROPDI</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Gere o relatório completo com inventário, valoração, inferências GIE/ATGI e Passivo Total Ajustado.
              </p>
              <div className="flex justify-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Gerar Relatório Executivo PDF
                </button>
                <button className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors border border-border">
                  Exportar XML/SGPED ANEEL
                </button>
              </div>

              <div className="mt-8 text-left max-w-md mx-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Seções incluídas:</p>
                {[
                  'Inventário completo de ativos',
                  'Valoração financeira (Motor de Valoração)',
                  '8 Inferências GIE com fontes rastreadas',
                  'Auditoria ATGI (Timeline + 4 tipos de gap)',
                  'Passivo Total Ajustado com memória de cálculo',
                  'KPIs validados (WP4 holdout dataset)',
                  'Referências documentais completas',
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
