import { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Shield, AlertTriangle, TrendingDown, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatPercent, riskBadgeClass, riskTextClass } from '@/lib/format';
import AssetDetailSheet from '@/components/AssetDetailSheet';
import type { Asset, TimelineEvent, InferenceGIE, InferenceATGI } from '@/types/grafter';

interface AssetInventoryTabProps {
  assets: any[];
  timelineEvents: any[];
  inferencesGIE: any[];
  inferencesATGI: any[];
  selectedAsset: any;
  onSelectAsset: (asset: any) => void;
}

type SortField = 'codigo' | 'valor_atual' | 'risk_score' | 'depreciacao_fisica_pct' | 'timeline_coverage_pct' | 'conformidade_score';
type SortDir = 'asc' | 'desc';

const riskOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const AssetInventoryTab = ({ assets, timelineEvents, inferencesGIE, inferencesATGI, selectedAsset, onSelectAsset }: AssetInventoryTabProps) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const assetTypes = useMemo(() => [...new Set(assets.map((a: any) => a.tipo).filter(Boolean))], [assets]);

  const filteredAssets = useMemo(() => {
    let result = [...assets] as any[];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a: any) =>
        a.codigo?.toLowerCase().includes(q) ||
        a.fabricante?.toLowerCase().includes(q) ||
        a.modelo?.toLowerCase().includes(q) ||
        a.numero_serie?.toLowerCase().includes(q)
      );
    }

    if (riskFilter) result = result.filter((a: any) => a.risk_score === riskFilter);
    if (typeFilter) result = result.filter((a: any) => a.tipo === typeFilter);

    result.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === 'risk_score') {
        cmp = (riskOrder[a.risk_score] ?? 0) - (riskOrder[b.risk_score] ?? 0);
      } else {
        cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [assets, search, riskFilter, typeFilter, sortField, sortDir]);

  const stats = useMemo(() => {
    const all = assets as any[];
    const totalCapex = all.reduce((s: number, a: any) => s + (a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0), 0);
    const totalValorAtual = all.reduce((s: number, a: any) => s + (a.valor_atual ?? 0), 0);
    const avgDeprAneel = all.length ? all.reduce((s: number, a: any) => s + (a.depreciacao_aneel_pct ?? 0), 0) / all.length : 0;
    const avgDeprFisica = all.length ? all.reduce((s: number, a: any) => s + (a.depreciacao_fisica_pct ?? 0), 0) / all.length : 0;
    const avgCoverage = all.length ? all.reduce((s: number, a: any) => s + (a.timeline_coverage_pct ?? 0), 0) / all.length : 0;
    const riskDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    all.forEach((a: any) => { if (a.risk_score && riskDist[a.risk_score as keyof typeof riskDist] !== undefined) riskDist[a.risk_score as keyof typeof riskDist]++; });
    const depreciationDelta = avgDeprFisica - avgDeprAneel;
    return { totalCapex, totalValorAtual, avgDeprAneel, avgDeprFisica, avgCoverage, riskDist, depreciationDelta, count: all.length };
  }, [assets]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ArrowUpDown className="w-3 h-3 opacity-40" />
  );

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-cyan" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CAPEX Corrigido Total</span>
          </div>
          <p className="font-mono text-lg font-bold">{formatCurrency(stats.totalCapex)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Base IPCA · {stats.count} ativos</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-green-brand" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Atual Líquido</span>
          </div>
          <p className="font-mono text-lg font-bold text-green-brand">{formatCurrency(stats.totalValorAtual)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Depreciação média: {formatPercent(stats.avgDeprAneel)} ANEEL · {formatPercent(stats.avgDeprFisica)} Física
          </p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-brand" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Delta Depreciação</span>
          </div>
          <p className={`font-mono text-lg font-bold ${stats.depreciationDelta > 0 ? 'text-red-brand' : 'text-green-brand'}`}>
            {stats.depreciationDelta > 0 ? '+' : ''}{formatPercent(stats.depreciationDelta)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Física vs. ANEEL · {stats.depreciationDelta > 0 ? 'Envelhecimento acelerado' : 'Dentro do esperado'}
          </p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-purple-brand" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Distribuição de Risco</span>
          </div>
          <div className="flex gap-1.5 mt-1">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
              <button
                key={level}
                onClick={() => setRiskFilter(riskFilter === level ? null : level)}
                className={`flex flex-col items-center px-2 py-1 rounded transition-all ${
                  riskFilter === level ? 'ring-1 ring-primary' : ''
                }`}
              >
                <span className={riskBadgeClass(level)} style={{ fontSize: '9px' }}>{level.slice(0, 4)}</span>
                <span className="font-mono text-xs mt-0.5">{stats.riskDist[level]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Depreciation Health Bar */}
      <div className="glass-panel-primary p-4">
        <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Mapa de Saúde do Parque — Depreciação Física vs. Regulatória</h4>
        <div className="grid grid-cols-1 gap-1.5">
          {(assets as any[]).slice().sort((a: any, b: any) => (b.depreciacao_fisica_pct ?? 0) - (a.depreciacao_fisica_pct ?? 0)).map((a: any) => {
            const delta = (a.depreciacao_fisica_pct ?? 0) - (a.depreciacao_aneel_pct ?? 0);
            const isOverDepreciated = delta > 0;
            return (
              <div key={a.id} className="flex items-center gap-2 group cursor-pointer hover:bg-muted/10 rounded px-1 py-0.5 transition-colors"
                onClick={() => onSelectAsset(a)}>
                <span className="font-mono text-[10px] text-cyan w-24 shrink-0 truncate">{a.codigo}</span>
                <div className="flex-1 h-3 rounded-sm bg-muted/20 relative overflow-hidden">
                  {/* ANEEL bar */}
                  <div className="absolute h-full rounded-sm bg-amber-brand/40" style={{ width: `${a.depreciacao_aneel_pct ?? 0}%` }} />
                  {/* Physical bar */}
                  <div className={`absolute h-full rounded-sm ${isOverDepreciated ? 'bg-red-brand/70' : 'bg-green-brand/70'}`}
                    style={{ width: `${a.depreciacao_fisica_pct ?? 0}%` }} />
                </div>
                <span className={`font-mono text-[10px] w-12 text-right ${isOverDepreciated ? 'text-red-brand' : 'text-green-brand'}`}>
                  {delta > 0 ? '+' : ''}{formatPercent(delta)}
                </span>
                <span className={`${riskBadgeClass(a.risk_score ?? 'LOW')} !text-[8px]`}>{(a.risk_score ?? 'LOW').slice(0, 4)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-brand/40 inline-block" /> Depr. ANEEL (regulatória)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-brand/70 inline-block" /> Depr. Física (acima ANEEL)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-brand/70 inline-block" /> Depr. Física (dentro do esperado)</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, fabricante, modelo, nº série..." className="pl-9 bg-muted/30 border-border" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={typeFilter ?? ''}
            onChange={(e) => setTypeFilter(e.target.value || null)}
            className="text-xs bg-muted/30 border border-border rounded px-2 py-1.5 text-foreground"
          >
            <option value="">Todos os tipos</option>
            {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {(riskFilter || typeFilter) && (
          <button onClick={() => { setRiskFilter(null); setTypeFilter(null); }}
            className="text-[10px] text-primary hover:underline">Limpar filtros</button>
        )}
        <span className="text-xs text-muted-foreground font-mono ml-auto">{filteredAssets.length} / {assets.length} ativos</span>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort('codigo')} className="flex items-center gap-1">Código <SortIcon field="codigo" /></button>
                </th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Tipo</th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fabricante / Modelo</th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort('valor_atual')} className="flex items-center gap-1">Valor Atual <SortIcon field="valor_atual" /></button>
                </th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">Depr. ANEEL vs Física</th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort('conformidade_score')} className="flex items-center gap-1">Conformidade <SortIcon field="conformidade_score" /></button>
                </th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort('timeline_coverage_pct')} className="flex items-center gap-1">Timeline <SortIcon field="timeline_coverage_pct" /></button>
                </th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium whitespace-nowrap">
                  <button onClick={() => toggleSort('risk_score')} className="flex items-center gap-1">Risco <SortIcon field="risk_score" /></button>
                </th>
                <th className="px-3 py-2.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((a: any) => {
                const deprDelta = (a.depreciacao_fisica_pct ?? 0) - (a.depreciacao_aneel_pct ?? 0);
                const healthScore = Math.round(
                  ((a.conformidade_score ?? 0) * 0.3 +
                  (Math.min(a.timeline_coverage_pct ?? 0, 100) / 100) * 0.3 +
                  (1 - Math.min(Math.abs(deprDelta) / 20, 1)) * 0.2 +
                  (a.risk_score === 'LOW' ? 1 : a.risk_score === 'MEDIUM' ? 0.6 : a.risk_score === 'HIGH' ? 0.3 : 0.1) * 0.2) * 100
                );
                const healthColor = healthScore >= 80 ? 'text-green-brand' : healthScore >= 60 ? 'text-amber-brand' : 'text-red-brand';

                return (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/10 cursor-pointer transition-colors"
                    onClick={() => onSelectAsset(a)}>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-cyan text-xs">{a.codigo}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs capitalize">{a.tipo}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-medium">{a.fabricante}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{a.modelo}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-mono text-xs font-medium">{formatCurrency(a.valor_atual ?? 0)}</span>
                      <span className="block text-[9px] text-muted-foreground font-mono">
                        CAPEX: {formatCurrency(a.capex_corrigido_ipca ?? a.capex_corrigido ?? 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground w-8">ANEEL</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted/30">
                            <div className="h-full rounded-full bg-amber-brand" style={{ width: `${a.depreciacao_aneel_pct ?? 0}%` }} />
                          </div>
                          <span className="text-[9px] font-mono w-10 text-right">{formatPercent(a.depreciacao_aneel_pct ?? 0)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground w-8">Física</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted/30">
                            <div className={`h-full rounded-full ${deprDelta > 0 ? 'bg-red-brand' : 'bg-green-brand'}`}
                              style={{ width: `${a.depreciacao_fisica_pct ?? 0}%` }} />
                          </div>
                          <span className={`text-[9px] font-mono w-10 text-right ${deprDelta > 0 ? 'text-red-brand' : 'text-green-brand'}`}>
                            {formatPercent(a.depreciacao_fisica_pct ?? 0)}
                          </span>
                        </div>
                        <span className={`text-[8px] font-mono ${deprDelta > 5 ? 'text-red-brand' : deprDelta > 0 ? 'text-amber-brand' : 'text-green-brand'}`}>
                          Δ {deprDelta > 0 ? '+' : ''}{formatPercent(deprDelta)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-mono font-bold"
                          style={{
                            borderColor: `hsl(${(a.conformidade_score ?? 0) > 0.85 ? 'var(--green)' : (a.conformidade_score ?? 0) > 0.7 ? 'var(--amber)' : 'var(--red)'})`,
                            color: `hsl(${(a.conformidade_score ?? 0) > 0.85 ? 'var(--green)' : (a.conformidade_score ?? 0) > 0.7 ? 'var(--amber)' : 'var(--red)'})`,
                          }}>
                          {Math.round((a.conformidade_score ?? 0) * 100)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-mono text-xs font-bold ${
                          (a.timeline_coverage_pct ?? 0) >= 80 ? 'text-green-brand' :
                          (a.timeline_coverage_pct ?? 0) >= 60 ? 'text-amber-brand' : 'text-red-brand'
                        }`}>
                          {formatPercent(a.timeline_coverage_pct ?? 0)}
                        </span>
                        <div className="w-12 h-1 rounded-full bg-muted/30">
                          <div className={`h-full rounded-full ${
                            (a.timeline_coverage_pct ?? 0) >= 80 ? 'bg-green-brand' :
                            (a.timeline_coverage_pct ?? 0) >= 60 ? 'bg-amber-brand' : 'bg-red-brand'
                          }`} style={{ width: `${a.timeline_coverage_pct ?? 0}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={riskBadgeClass(a.risk_score ?? 'LOW')}>{a.risk_score ?? 'LOW'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-mono font-bold ${healthColor}`}
                          style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                          {healthScore}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Footer */}
      <div className="glass-panel p-3">
        <p className="text-[9px] font-mono text-muted-foreground">
          Health Score = Conformidade(30%) + Timeline Coverage(30%) + Depr. Delta(20%) + Risk Score(20%) · 
          Depr. Física via Weibull parametrizada por tipo (β, η calibrados base Grafter) · 
          Conformidade = match semântico edital × as-built (cosine sim {'>'} 0.85) · 
          REN ANEEL 674/2015 Anexo I · MCPSE Módulo 12 · CPC 27
        </p>
      </div>

      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset}
        onClose={() => onSelectAsset(null)}
        timelineEvents={timelineEvents}
        inferences={[
          ...(inferencesGIE as any[]).filter((i: any) => i.asset_id === selectedAsset?.id),
          ...(inferencesATGI as any[]).filter((i: any) => i.asset_id === selectedAsset?.id),
        ]}
      />
    </div>
  );
};

export default AssetInventoryTab;
