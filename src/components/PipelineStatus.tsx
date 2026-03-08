import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';
import type { PipelineStep } from '@/types/grafter';

const PipelineStatus = ({ steps }: { steps: PipelineStep[] }) => {
  return (
    <div className="glass-panel-cyan p-4">
      <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Pipeline de Processamento</h3>
      <div className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono ${
                step.status === 'done'
                  ? 'bg-green-brand/10 text-green-brand border border-green-brand/20'
                  : step.status === 'processing'
                  ? 'bg-amber-brand/10 text-amber-brand border border-amber-brand/20 animate-pulse'
                  : 'bg-muted/30 text-muted-foreground border border-border'
              }`}
            >
              {step.status === 'done' && <Check className="w-3 h-3" />}
              {step.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
              {step.status === 'pending' && <Circle className="w-3 h-3" />}
              <span>{step.id}</span>
              <span className="hidden sm:inline">{step.label}</span>
              {step.duration && <span className="text-muted-foreground">{step.duration}</span>}
            </motion.div>
            {i < steps.length - 1 && (
              <div className={`w-6 h-px ${step.status === 'done' ? 'bg-green-brand/40' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineStatus;
