// Timeline events are typed as `any` to support both DB rows and extended mock fields
import { formatCurrency } from '@/lib/format';

const layerConfig = {
  edital: { label: 'EDITAL', color: 'bg-cyan', desc: 'Especificações contratadas' },
  as_built: { label: 'AS-BUILT', color: 'bg-amber-brand', desc: 'Configuração instalada' },
  manutencao: { label: 'MANUTENÇÃO', color: 'bg-green-brand', desc: 'Inspeções e manutenções' },
  operacional: { label: 'EVENTOS', color: 'bg-red-brand', desc: 'Falhas e penalidades' },
};

const severityColors: Record<string, string> = {
  critical: 'ring-2 ring-red-brand',
  major: 'ring-2 ring-amber-brand',
  minor: 'ring-1 ring-muted-foreground',
};

const AssetTimeline = ({ events }: { events: TimelineEvent[] }) => {
  if (!events.length) return <p className="text-muted-foreground text-sm">Nenhum evento registrado.</p>;

  const sorted = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const dates = sorted.map(e => new Date(e.event_date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const range = maxDate - minDate || 1;

  const layers: (keyof typeof layerConfig)[] = ['edital', 'as_built', 'manutencao', 'operacional'];

  // Detect gap periods (>8 months without events in manutencao layer)
  const maintenanceEvents = sorted.filter(e => e.layer === 'manutencao');
  const gapPeriods: { start: number; end: number; months: number }[] = [];
  for (let i = 0; i < maintenanceEvents.length - 1; i++) {
    const curr = new Date(maintenanceEvents[i].event_date).getTime();
    const next = new Date(maintenanceEvents[i + 1].event_date).getTime();
    const monthsDiff = (next - curr) / (1000 * 60 * 60 * 24 * 30.44);
    if (monthsDiff > 8) {
      gapPeriods.push({ start: curr, end: next, months: Math.round(monthsDiff) });
    }
  }

  const totalMonths = Math.round(range / (1000 * 60 * 60 * 24 * 30.44));
  const gapMonths = gapPeriods.reduce((s, g) => s + g.months, 0);
  const coveragePct = totalMonths > 0 ? Math.round(((totalMonths - gapMonths) / totalMonths) * 100) : 100;
  const gapCount = sorted.filter(e => e.gap_type).length;
  const unresolvedCount = sorted.filter(e => !e.has_resolution).length;

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Timeline de Eventos</h4>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-muted-foreground">{sorted.length} eventos</span>
          <span className={coveragePct >= 80 ? 'text-green-brand' : coveragePct >= 60 ? 'text-amber-brand' : 'text-red-brand'}>
            Cobertura: {coveragePct}%
          </span>
          {gapCount > 0 && <span className="text-red-brand">{gapCount} gaps</span>}
          {unresolvedCount > 0 && <span className="text-red-brand">{unresolvedCount} sem resolução</span>}
        </div>
      </div>

      {/* Year markers */}
      <div className="relative h-6 mb-2">
        {Array.from({ length: 10 }, (_, i) => {
          const year = new Date(minDate).getFullYear() + i;
          const yearTs = new Date(`${year}-01-01`).getTime();
          const pos = ((yearTs - minDate) / range) * 100;
          if (pos < 0 || pos > 100) return null;
          return (
            <span key={year} className="absolute text-[10px] font-mono text-muted-foreground" style={{ left: `${pos}%` }}>
              {year}
            </span>
          );
        })}
      </div>

      {/* Gap period highlights (full-height) */}
      <div className="relative">
        {layers.map((layer) => {
          const layerEvents = sorted.filter(e => e.layer === layer);
          const config = layerConfig[layer];

          return (
            <div key={layer} className="flex items-center gap-3 mb-1 group/layer">
              <div className="w-28 shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground block">{config.label}</span>
                <span className="text-[8px] text-muted-foreground/60">{config.desc}</span>
              </div>
              <div className="relative flex-1 h-10 rounded bg-muted/20">
                {/* Track line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

                {/* Gap period backgrounds */}
                {layer === 'manutencao' && gapPeriods.map((gap, idx) => {
                  const startPos = ((gap.start - minDate) / range) * 100;
                  const endPos = ((gap.end - minDate) / range) * 100;
                  return (
                    <div key={`gap-bg-${idx}`} className="absolute top-0 bottom-0 bg-red-brand/8 border-l border-r border-red-brand/20 border-dashed group/gap"
                      style={{ left: `${startPos}%`, width: `${endPos - startPos}%` }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-mono text-red-brand/60 whitespace-nowrap">
                        ⚠ {gap.months}m gap
                      </div>
                    </div>
                  );
                })}

                {/* Event dots */}
                {layerEvents.map((event) => {
                  const pos = ((new Date(event.event_date).getTime() - minDate) / range) * 100;
                  const severityRing = event.severity ? severityColors[event.severity] ?? '' : '';
                  return (
                    <div
                      key={event.id}
                      className="absolute top-1/2 -translate-y-1/2 group/dot z-10"
                      style={{ left: `${pos}%` }}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-transform hover:scale-[1.8] ${severityRing} ${
                        event.gap_type
                          ? 'bg-red-brand border-red-brand animate-pulse'
                          : !event.has_resolution
                            ? 'bg-amber-brand border-amber-brand'
                            : `${config.color} border-current`
                      }`} />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/dot:block z-20">
                        <div className="glass-panel p-2.5 text-[10px] max-w-[280px] space-y-1 shadow-lg">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-muted-foreground">{event.event_date}</span>
                            {event.severity && (
                              <span className={`text-[8px] font-mono uppercase ${
                                event.severity === 'critical' ? 'text-red-brand' :
                                event.severity === 'major' ? 'text-amber-brand' : 'text-muted-foreground'
                              }`}>{event.severity}</span>
                            )}
                          </div>
                          <p className="leading-relaxed">{event.description}</p>
                          {event.impact_value && (
                            <p className="font-mono text-red-brand">Impacto: {formatCurrency(event.impact_value)}</p>
                          )}
                          {event.source_doc && (
                            <p className="font-mono text-muted-foreground/80">📎 {event.source_doc}</p>
                          )}
                          {event.gap_type && (
                            <p className="text-red-brand font-mono">⚠ {event.gap_type}</p>
                          )}
                          {!event.has_resolution && (
                            <p className="text-amber-brand font-mono">⏳ Sem resolução</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-green-brand" /> Normal
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-brand" /> Sem resolução
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-red-brand animate-pulse" /> Gap detectado
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <div className="w-4 h-2.5 bg-red-brand/10 border border-dashed border-red-brand/30 rounded" /> Período sem registro
        </div>
      </div>
    </div>
  );
};

export default AssetTimeline;
