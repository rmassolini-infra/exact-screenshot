import { motion } from 'framer-motion';
import type { InferenceGIE } from '@/types/grafter';
import { formatCurrency, riskBadgeClass } from '@/lib/format';

const InferenceGIECard = ({ inference }: { inference: InferenceGIE }) => {
  const panelClass = inference.level === 'CRITICAL' ? 'glass-panel-red' :
    inference.level === 'HIGH' ? 'glass-panel-amber' :
    inference.level === 'MEDIUM' ? 'glass-panel-cyan' : 'glass-panel';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${panelClass} p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-muted-foreground">{inference.inference_id}</span>
        <span className={riskBadgeClass(inference.level)}>{inference.level}</span>
      </div>

      <h4 className="font-semibold mb-3">{inference.title}</h4>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Descoberta</p>
          <p className="text-muted-foreground leading-relaxed">{inference.finding}</p>
        </div>

        <div className="flex items-center gap-2 py-2 px-3 rounded bg-muted/30">
          <span className="text-xs text-muted-foreground">Impacto financeiro:</span>
          <span className={`font-mono font-bold ${inference.impact_value >= 0 ? 'text-green-brand' : 'text-red-brand'}`}>
            {formatCurrency(inference.impact_value)}
          </span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ação Recomendada</p>
          <p className="text-muted-foreground leading-relaxed">{inference.recommendation}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {inference.source_documents.map((s, i) => (
            <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">
              📎 {s.doc_name} (p.{s.page})
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confiança:</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/50">
            <div
              className={`h-full rounded-full ${inference.confidence_score >= 0.85 ? 'bg-green-brand' : inference.confidence_score >= 0.7 ? 'bg-amber-brand' : 'bg-red-brand'}`}
              style={{ width: `${inference.confidence_score * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono">{Math.round(inference.confidence_score * 100)}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default InferenceGIECard;
