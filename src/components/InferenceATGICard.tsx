import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FlaskConical, Scale, Calendar, Link2, DollarSign } from 'lucide-react';
// Using `any` for inference prop to support both DB rows and extended fields
import { formatCurrency } from '@/lib/format';

const severityConfig: Record<string, { label: string; class: string }> = {
  critical: { label: 'CRITICAL', class: 'text-red-brand bg-red-brand/10 border-red-brand/20' },
  major: { label: 'MAJOR', class: 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' },
  minor: { label: 'MINOR', class: 'text-muted-foreground bg-muted/30 border-border' },
  observation: { label: 'OBS', class: 'text-muted-foreground bg-muted/20 border-border' },
};

const InferenceATGICard = ({ inference }: { inference: any }) => {
  const [expanded, setExpanded] = useState(false);
  const severity = inference.severity ? severityConfig[inference.severity] : null;

  const isMonetary = inference.value > 100;
  const displayValue = isMonetary ? formatCurrency(inference.value) :
    inference.value <= 1 ? `${(inference.value * 100).toFixed(0)}%` : String(inference.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-purple p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-purple-brand">{inference.inference_id}</span>
          {severity && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${severity.class}`}>
              {severity.label}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-foreground">{displayValue}</span>
      </div>

      <h4 className="text-sm font-semibold mb-2">{inference.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{inference.finding}</p>

      {/* Gap type + remediation */}
      <div className="flex flex-wrap gap-2 mb-2">
        {inference.gap_type && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-brand/10 text-red-brand border border-red-brand/20">
            {inference.gap_type}
          </span>
        )}
        {inference.remediation_cost && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-brand/10 text-amber-brand border border-amber-brand/20 flex items-center gap-1">
            <DollarSign className="w-2.5 h-2.5" /> Remediação: {formatCurrency(inference.remediation_cost)}
          </span>
        )}
        {inference.remediation_timeline && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/30 text-muted-foreground border border-border flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> {inference.remediation_timeline}
          </span>
        )}
      </div>

      {/* Affected period */}
      {inference.affected_period && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" />
          <span className="font-mono">{inference.affected_period.start} → {inference.affected_period.end}</span>
        </div>
      )}

      {/* Expand toggle */}
      {(inference.methodology || inference.regulatory_basis || inference.source_documents) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Ocultar' : 'Detalhes'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2 border-t border-border pt-2 mt-2"
              >
                {inference.methodology && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <FlaskConical className="w-2.5 h-2.5" /> Metodologia
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-mono bg-muted/20 p-1.5 rounded">{inference.methodology}</p>
                  </div>
                )}
                {inference.regulatory_basis && (
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5" /> Base Regulatória
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{inference.regulatory_basis}</p>
                  </div>
                )}
                {inference.source_documents && inference.source_documents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {inference.source_documents.map((s, i) => (
                      <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">
                        📎 {s.doc_name} (p.{s.page})
                      </span>
                    ))}
                  </div>
                )}
                {inference.cross_references && inference.cross_references.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Link2 className="w-2.5 h-2.5 text-muted-foreground" />
                    {inference.cross_references.map((ref) => (
                      <span key={ref} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default InferenceATGICard;
