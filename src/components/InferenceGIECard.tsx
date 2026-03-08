import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FlaskConical, Scale, BarChart3, FileCheck, Link2 } from 'lucide-react';
// Using `any` for inference prop to support both DB rows and extended fields
import { formatCurrency, riskBadgeClass } from '@/lib/format';

const docTypeLabels: Record<string, string> = {
  nota_fiscal: 'NF',
  laudo_tecnico: 'LAUDO',
  edital: 'EDITAL',
  relatorio_aneel: 'ANEEL',
  ordem_servico: 'OS',
  manual: 'MANUAL',
  contrato: 'CONTRATO',
};

const validationLabels: Record<string, { label: string; class: string }> = {
  validated: { label: 'Validado', class: 'text-green-brand bg-green-brand/10 border-green-brand/20' },
  pending_review: { label: 'Revisão pendente', class: 'text-amber-brand bg-amber-brand/10 border-amber-brand/20' },
  requires_field_inspection: { label: 'Inspeção requerida', class: 'text-red-brand bg-red-brand/10 border-red-brand/20' },
};

const InferenceGIECard = ({ inference }: { inference: InferenceGIE }) => {
  const [expanded, setExpanded] = useState(false);

  const panelClass = inference.level === 'CRITICAL' ? 'glass-panel-red' :
    inference.level === 'HIGH' ? 'glass-panel-amber' :
    inference.level === 'MEDIUM' ? 'glass-panel-cyan' : 'glass-panel';

  const validation = inference.validation_status ? validationLabels[inference.validation_status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${panelClass} p-5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{inference.inference_id}</span>
          {validation && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${validation.class}`}>
              {validation.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {inference.affected_assets && (
            <span className="text-[10px] font-mono text-muted-foreground">{inference.affected_assets} ativos</span>
          )}
          <span className={riskBadgeClass(inference.level)}>{inference.level}</span>
        </div>
      </div>

      <h4 className="font-semibold mb-3 text-sm leading-snug">{inference.title}</h4>

      <div className="space-y-3 text-sm">
        {/* Finding */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Descoberta</p>
          <p className="text-muted-foreground leading-relaxed text-xs">{inference.finding}</p>
        </div>

        {/* Impact + Sensitivity */}
        <div className="p-3 rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Impacto financeiro (cenário base):</span>
            <span className={`font-mono font-bold ${inference.impact_value >= 0 ? 'text-green-brand' : 'text-red-brand'}`}>
              {formatCurrency(inference.impact_value)}
            </span>
          </div>
          {inference.sensitivity && (
            <div className="flex gap-2">
              {inference.sensitivity.map((s) => (
                <div key={s.scenario} className="flex-1 text-center p-1.5 rounded bg-muted/30">
                  <p className="text-[9px] text-muted-foreground capitalize">{s.scenario}</p>
                  <p className={`text-[10px] font-mono ${s.value >= 0 ? 'text-green-brand' : 'text-red-brand'}`}>
                    {formatCurrency(s.value)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{(s.probability * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ação Recomendada</p>
          <p className="text-muted-foreground leading-relaxed text-xs">{inference.recommendation}</p>
        </div>

        {/* Source docs */}
        <div className="flex flex-wrap gap-1.5">
          {inference.source_documents.map((s, i) => (
            <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border flex items-center gap-1">
              📎 {s.doc_type ? docTypeLabels[s.doc_type] ?? s.doc_type : ''} {s.doc_name} (p.{s.page})
              {s.confidence && <span className="text-[8px] opacity-60">{(s.confidence * 100).toFixed(0)}%</span>}
            </span>
          ))}
        </div>

        {/* Confidence bar */}
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

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ocultar detalhes técnicos' : 'Detalhes técnicos'}
        </button>

        {/* Expanded technical section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3 border-t border-border pt-3"
            >
              {inference.methodology && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" /> Metodologia
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono bg-muted/20 p-2 rounded">{inference.methodology}</p>
                </div>
              )}

              {inference.regulatory_basis && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Base Regulatória
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{inference.regulatory_basis}</p>
                </div>
              )}

              {inference.calculation_memo && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Memória de Cálculo
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono bg-muted/20 p-2 rounded">{inference.calculation_memo}</p>
                </div>
              )}

              {inference.cross_references && inference.cross_references.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Referências Cruzadas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {inference.cross_references.map((ref) => (
                      <span key={ref} className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default InferenceGIECard;
