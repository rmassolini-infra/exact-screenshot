import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatCurrency, formatPercent, riskBadgeClass } from '@/lib/format';
import AssetTimeline from '@/components/AssetTimeline';
import type { TimelineEvent } from '@/types/grafter';

interface AssetDetailSheetProps {
  asset: any;
  open: boolean;
  onClose: () => void;
  timelineEvents?: TimelineEvent[];
  inferences?: any[];
}

const tabs = ['Dados Gerais', 'Valoração', 'Timeline', 'Inferências'];

const AssetDetailSheet = ({ asset, open, onClose, timelineEvents = [], inferences = [] }: AssetDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState('Dados Gerais');

  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-cyan">{asset.codigo}</span>
            <span className={riskBadgeClass(asset.risk_score ?? 'LOW')}>{asset.risk_score}</span>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{asset.fabricante} {asset.modelo}</p>
        </SheetHeader>

        {/* Sub-tabs */}
        <div className="flex gap-1 mt-4 mb-4 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs border-b-2 transition-all ${
                activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Dados Gerais' && (
          <div className="space-y-3">
            {[
              ['Código', asset.codigo],
              ['Tipo', asset.tipo],
              ['Fabricante', asset.fabricante],
              ['Modelo', asset.modelo],
              ['Nº Série', asset.numero_serie],
              ['Data Aquisição', asset.data_aquisicao],
              ['Vida Útil Contratada', `${asset.vida_util_contratada_anos} anos`],
              ['Vida Útil Restante', `${asset.vida_util_restante_anos?.toFixed(1)} anos`],
              ['Cobertura Timeline', formatPercent(asset.timeline_coverage_pct ?? 0)],
              ['Score Conformidade', formatPercent((asset.conformidade_score ?? 0) * 100)],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between text-sm py-1 border-b border-border/30">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Valoração' && (
          <div className="space-y-4">
            <div className="glass-panel p-4 space-y-2">
              {[
                ['CAPEX Original', formatCurrency(asset.capex_original ?? 0)],
                ['CAPEX Corrigido IPCA', formatCurrency(asset.capex_corrigido_ipca ?? asset.capex_corrigido ?? 0)],
                ['Depreciação ANEEL', formatPercent(asset.depreciacao_aneel_pct ?? 0)],
                ['Depreciação Física', formatPercent(asset.depreciacao_fisica_pct ?? 0)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono">{value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                <span className="text-green-brand">Valor Atual</span>
                <span className="font-mono text-green-brand">{formatCurrency(asset.valor_atual ?? 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Risk Score:</span>
              <span className={riskBadgeClass(asset.risk_score ?? 'LOW')}>{asset.risk_score}</span>
            </div>
          </div>
        )}

        {activeTab === 'Timeline' && (
          <AssetTimeline events={timelineEvents} />
        )}

        {activeTab === 'Inferências' && (
          <div className="space-y-3">
            {inferences.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma inferência associada a este ativo.</p>
            )}
            {inferences.map((inf: any) => (
              <div key={inf.id} className="glass-panel p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{inf.inference_id}</span>
                  <span className={riskBadgeClass(inf.level ?? 'LOW')}>{inf.level}</span>
                </div>
                <p className="text-sm font-medium">{inf.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{inf.finding}</p>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AssetDetailSheet;
