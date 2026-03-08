import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency, formatPercent, riskBadgeClass, riskTextClass } from '@/lib/format';
import { ChevronDown, FileText, AlertTriangle, Shield, Activity, Calendar, Wrench, TrendingDown } from 'lucide-react';
import AssetTimeline from '@/components/AssetTimeline';
import type { TimelineEvent } from '@/types/grafter';

interface AssetDetailSheetProps {
  asset: any;
  open: boolean;
  onClose: () => void;
  timelineEvents?: TimelineEvent[];
  inferences?: any[];
}

const tabs = ['Ficha Técnica', 'Valoração & Risco', 'Timeline', 'Inferências', 'Documentos'];

const AssetDetailSheet = ({ asset, open, onClose, timelineEvents = [], inferences = [] }: AssetDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState('Ficha Técnica');

  if (!asset) return null;

  const deprDelta = (asset.depreciacao_fisica_pct ?? 0) - (asset.depreciacao_aneel_pct ?? 0);
  const healthScore = Math.round(
    ((asset.conformidade_score ?? 0) * 0.3 +
    (Math.min(asset.timeline_coverage_pct ?? 0, 100) / 100) * 0.3 +
    (1 - Math.min(Math.abs(deprDelta) / 20, 1)) * 0.2 +
    (asset.risk_score === 'LOW' ? 1 : asset.risk_score === 'MEDIUM' ? 0.6 : asset.risk_score === 'HIGH' ? 0.3 : 0.1) * 0.2) * 100
  );
  const healthColor = healthScore >= 80 ? 'text-green-brand' : healthScore >= 60 ? 'text-amber-brand' : 'text-red-brand';
  const depreciationGap = (asset.capex_corrigido_ipca ?? asset.capex_corrigido ?? 0) - (asset.valor_atual ?? 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-cyan text-lg">{asset.codigo}</span>
            <span className={riskBadgeClass(asset.risk_score ?? 'LOW')}>{asset.risk_score}</span>
            <span className={`font-mono text-sm font-bold ${healthColor}`} style={{ background: 'hsl(var(--muted) / 0.3)', padding: '2px 8px', borderRadius: '9999px' }}>
              H:{healthScore}
            </span>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{asset.fabricante} · {asset.modelo} · SN: {asset.numero_serie}</p>
        </SheetHeader>

        {/* Sub-tabs */}
        <div className="flex gap-0.5 mt-4 mb-4 border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[10px] border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Ficha Técnica' && (
          <div className="space-y-4">
            {/* Identity */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Identificação do Ativo
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ['Código', asset.codigo],
                  ['Tipo', asset.tipo],
                  ['Fabricante', asset.fabricante],
                  ['Modelo', asset.modelo],
                  ['Nº Série', asset.numero_serie],
                  ['Data Aquisição', asset.data_aquisicao],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between text-sm py-1 border-b border-border/20">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-mono text-xs">{value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lifecycle */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Ciclo de Vida
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vida Útil Contratada</span>
                  <span className="font-mono">{asset.vida_util_contratada_anos} anos</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vida Útil Restante</span>
                  <span className="font-mono">{asset.vida_util_restante_anos?.toFixed(1)} anos</span>
                </div>
                {/* Life bar */}
                <div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                    <span>Utilização do ciclo</span>
                    <span>{formatPercent(100 - ((asset.vida_util_restante_anos ?? 0) / (asset.vida_util_contratada_anos ?? 30)) * 100)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/30">
                    <div className="h-full rounded-full bg-primary"
                      style={{ width: `${100 - ((asset.vida_util_restante_anos ?? 0) / (asset.vida_util_contratada_anos ?? 30)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage & Conformidade */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Indicadores de Qualidade
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold ${healthColor}`}
                    style={{ borderColor: 'currentColor' }}>
                    {healthScore}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 block">Health Score</span>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold`}
                    style={{
                      borderColor: `hsl(${(asset.conformidade_score ?? 0) > 0.85 ? 'var(--green)' : (asset.conformidade_score ?? 0) > 0.7 ? 'var(--amber)' : 'var(--red)'})`,
                      color: `hsl(${(asset.conformidade_score ?? 0) > 0.85 ? 'var(--green)' : (asset.conformidade_score ?? 0) > 0.7 ? 'var(--amber)' : 'var(--red)'})`,
                    }}>
                    {Math.round((asset.conformidade_score ?? 0) * 100)}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 block">Conformidade</span>
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold ${
                    (asset.timeline_coverage_pct ?? 0) >= 80 ? 'text-green-brand' :
                    (asset.timeline_coverage_pct ?? 0) >= 60 ? 'text-amber-brand' : 'text-red-brand'
                  }`} style={{ borderColor: 'currentColor' }}>
                    {Math.round(asset.timeline_coverage_pct ?? 0)}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 block">Timeline %</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Valoração & Risco' && (
          <div className="space-y-4">
            {/* Valuation Waterfall */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" /> Cascata de Valoração
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">CAPEX Original</span>
                  <span className="font-mono">{formatCurrency(asset.capex_original ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">Correção IPCA</span>
                  <span className="font-mono text-primary">
                    +{formatCurrency((asset.capex_corrigido_ipca ?? asset.capex_corrigido ?? 0) - (asset.capex_original ?? 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">CAPEX Corrigido</span>
                  <span className="font-mono font-medium">{formatCurrency(asset.capex_corrigido_ipca ?? asset.capex_corrigido ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">Depreciação acumulada</span>
                  <span className="font-mono text-red-brand">-{formatCurrency(depreciationGap)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 font-semibold">
                  <span className="text-green-brand">Valor Atual Líquido</span>
                  <span className="font-mono text-green-brand">{formatCurrency(asset.valor_atual ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Depreciation Comparison */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Análise de Depreciação — ANEEL vs. Física</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Depreciação ANEEL (REN 674 Anexo I)</span>
                    <span className="font-mono">{formatPercent(asset.depreciacao_aneel_pct ?? 0)}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted/30">
                    <div className="h-full rounded-full bg-amber-brand" style={{ width: `${asset.depreciacao_aneel_pct ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Depreciação Física (Weibull + Laudos)</span>
                    <span className={`font-mono ${deprDelta > 0 ? 'text-red-brand' : 'text-green-brand'}`}>
                      {formatPercent(asset.depreciacao_fisica_pct ?? 0)}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-muted/30">
                    <div className={`h-full rounded-full ${deprDelta > 0 ? 'bg-red-brand' : 'bg-green-brand'}`}
                      style={{ width: `${asset.depreciacao_fisica_pct ?? 0}%` }} />
                  </div>
                </div>
                <div className={`text-xs font-mono p-2 rounded border ${
                  deprDelta > 5 ? 'text-red-brand border-red-brand/20 bg-red-brand/5' :
                  deprDelta > 0 ? 'text-amber-brand border-amber-brand/20 bg-amber-brand/5' :
                  'text-green-brand border-green-brand/20 bg-green-brand/5'
                }`}>
                  Δ = {deprDelta > 0 ? '+' : ''}{formatPercent(deprDelta)} · {
                    deprDelta > 5 ? '⚠ Envelhecimento acelerado — requer inspeção física' :
                    deprDelta > 0 ? '⚠ Leve desvio — monitorar' :
                    '✓ Dentro do padrão regulatório'
                  }
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="glass-panel p-4">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Avaliação de Risco Multifatorial
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Cobertura Documental', value: (asset.timeline_coverage_pct ?? 0), weight: '30%', threshold: 80 },
                  { label: 'Conformidade Contratual', value: (asset.conformidade_score ?? 0) * 100, weight: '30%', threshold: 85 },
                  { label: 'Divergência Depreciação', value: Math.max(0, 100 - Math.abs(deprDelta) * 5), weight: '20%', threshold: 75 },
                  { label: 'Idade vs. Vida Útil', value: ((asset.vida_util_restante_anos ?? 0) / (asset.vida_util_contratada_anos ?? 30)) * 100, weight: '20%', threshold: 50 },
                ].map(factor => (
                  <div key={factor.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-40 shrink-0">{factor.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30">
                      <div className={`h-full rounded-full ${factor.value >= factor.threshold ? 'bg-green-brand' : factor.value >= factor.threshold * 0.75 ? 'bg-amber-brand' : 'bg-red-brand'}`}
                        style={{ width: `${Math.min(factor.value, 100)}%` }} />
                    </div>
                    <span className="text-[9px] font-mono w-10 text-right">{formatPercent(factor.value)}</span>
                    <span className="text-[8px] text-muted-foreground w-8">{factor.weight}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2">
                <span className="text-xs text-muted-foreground">Risk Score Final</span>
                <span className={riskBadgeClass(asset.risk_score ?? 'LOW')}>{asset.risk_score ?? 'LOW'}</span>
              </div>
              <p className="text-[8px] text-muted-foreground mt-2 font-mono">
                Modelo: Random Forest (14 features) · SHAP explanability · Calibrado base Grafter (1.847 ativos) · AUC-ROC: 0.87
              </p>
            </div>
          </div>
        )}

        {activeTab === 'Timeline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {timelineEvents.length} eventos · Cobertura: <span className={`font-mono font-bold ${
                  (asset.timeline_coverage_pct ?? 0) >= 80 ? 'text-green-brand' : 'text-amber-brand'
                }`}>{formatPercent(asset.timeline_coverage_pct ?? 0)}</span>
              </span>
            </div>
            <AssetTimeline events={timelineEvents} />
          </div>
        )}

        {activeTab === 'Inferências' && (
          <div className="space-y-3">
            {inferences.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma inferência associada a este ativo.</p>
            )}
            {inferences.map((inf: any) => (
              <Collapsible key={inf.id}>
                <div className="glass-panel overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-2 text-left">
                      <span className="font-mono text-[10px] text-cyan">{inf.inference_id}</span>
                      <span className={riskBadgeClass(inf.level ?? inf.severity ?? 'LOW')}>{inf.level ?? inf.severity}</span>
                      <span className="text-xs font-medium truncate max-w-[200px]">{inf.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {inf.impact_value && (
                        <span className={`font-mono text-xs ${(inf.impact_value ?? 0) < 0 ? 'text-red-brand' : 'text-green-brand'}`}>
                          {formatCurrency(inf.impact_value)}
                        </span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">{inf.finding}</p>
                      {inf.recommendation && (
                        <div className="p-2 rounded bg-primary/5 border border-primary/10">
                          <span className="text-[9px] text-primary uppercase tracking-wider font-medium">Recomendação</span>
                          <p className="text-xs text-muted-foreground mt-1">{inf.recommendation}</p>
                        </div>
                      )}
                      {inf.methodology && (
                        <p className="text-[9px] text-muted-foreground font-mono">
                          <span className="text-foreground/60">Metodologia:</span> {inf.methodology}
                        </p>
                      )}
                      {inf.regulatory_basis && (
                        <p className="text-[9px] text-muted-foreground font-mono">
                          <span className="text-foreground/60">Base regulatória:</span> {inf.regulatory_basis}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {activeTab === 'Documentos' && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Documentos-Fonte Rastreados</p>
            {(() => {
              const docs = new Map<string, { doc_name: string; doc_type?: string; pages: number[]; confidence?: number }>();
              [...(inferences ?? [])].forEach((inf: any) => {
                (inf.source_documents ?? []).forEach((sd: any) => {
                  const existing = docs.get(sd.doc_name);
                  if (existing) {
                    if (!existing.pages.includes(sd.page)) existing.pages.push(sd.page);
                  } else {
                    docs.set(sd.doc_name, { doc_name: sd.doc_name, doc_type: sd.doc_type, pages: [sd.page], confidence: sd.confidence });
                  }
                });
              });
              const docList = [...docs.values()];
              if (docList.length === 0) return <p className="text-sm text-muted-foreground">Nenhum documento rastreado para este ativo.</p>;
              return docList.map(doc => (
                <div key={doc.doc_name} className="glass-panel p-3 flex items-start gap-3">
                  <FileText className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-mono font-medium">{doc.doc_name}</p>
                    <div className="flex gap-3 mt-1">
                      {doc.doc_type && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30 border border-border text-muted-foreground">
                          {doc.doc_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">p. {doc.pages.sort((a, b) => a - b).join(', ')}</span>
                      {doc.confidence && (
                        <span className={`text-[9px] font-mono ${doc.confidence >= 0.95 ? 'text-green-brand' : doc.confidence >= 0.85 ? 'text-amber-brand' : 'text-red-brand'}`}>
                          conf: {(doc.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AssetDetailSheet;
