import type { TimelineEvent } from '@/types/grafter';

const layerConfig = {
  edital: { label: 'EDITAL', color: 'bg-cyan' },
  as_built: { label: 'AS-BUILT', color: 'bg-amber-brand' },
  manutencao: { label: 'MANUTENÇÃO', color: 'bg-green-brand' },
  operacional: { label: 'EVENTOS', color: 'bg-red-brand' },
};

const AssetTimeline = ({ events }: { events: TimelineEvent[] }) => {
  if (!events.length) return <p className="text-muted-foreground text-sm">Nenhum evento registrado.</p>;

  const dates = events.map(e => new Date(e.event_date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const range = maxDate - minDate || 1;

  const layers: (keyof typeof layerConfig)[] = ['edital', 'as_built', 'manutencao', 'operacional'];

  return (
    <div className="glass-panel p-5 space-y-4">
      <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Timeline de Eventos</h4>

      {/* Year markers */}
      <div className="relative h-6 mb-2">
        {Array.from({ length: 6 }, (_, i) => {
          const year = new Date(minDate).getFullYear() + i * 2;
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

      {layers.map((layer) => {
        const layerEvents = events.filter(e => e.layer === layer);
        const config = layerConfig[layer];

        return (
          <div key={layer} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">{config.label}</span>
            <div className="relative flex-1 h-8 rounded bg-muted/20">
              {/* Track line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

              {layerEvents.map((event) => {
                const pos = ((new Date(event.event_date).getTime() - minDate) / range) * 100;
                return (
                  <div
                    key={event.id}
                    className="absolute top-1/2 -translate-y-1/2 group"
                    style={{ left: `${pos}%` }}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-150 ${
                      event.gap_type
                        ? 'bg-red-brand border-red-brand animate-pulse'
                        : `${config.color} border-current`
                    }`} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="glass-panel p-2 text-[10px] whitespace-nowrap max-w-[200px]">
                        <p className="font-mono text-muted-foreground">{event.event_date}</p>
                        <p className="truncate">{event.description}</p>
                        {event.gap_type && (
                          <p className="text-red-brand font-mono mt-1">⚠ {event.gap_type}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Gap highlights */}
              {layerEvents.filter(e => e.gap_type).map((event) => {
                const pos = ((new Date(event.event_date).getTime() - minDate) / range) * 100;
                return (
                  <div
                    key={`gap-${event.id}`}
                    className="absolute top-0 bottom-0 bg-red-brand/10 border-l border-r border-red-brand/20"
                    style={{ left: `${Math.max(0, pos - 3)}%`, width: '6%' }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssetTimeline;
