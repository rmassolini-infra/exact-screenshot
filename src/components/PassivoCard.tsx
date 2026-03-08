import { motion } from 'framer-motion';
import type { PassivoAjustado } from '@/types/grafter';
import { formatCurrency } from '@/lib/format';

const PassivoCard = ({ passivo }: { passivo: PassivoAjustado }) => {
  const lines = [
    { label: 'Preço declarado (base RAB)', value: passivo.seller_price, positive: true },
    { label: '(-) Desvio de instalação (ATGI T1)', value: -passivo.ajuste_tipo1 },
    { label: '(-) Manutenção não executada', value: -passivo.ajuste_tipo2 },
    { label: '(-) Gaps regulatórios (ATGI T5)', value: -passivo.ajuste_tipo3 },
    { label: '(-) Divergência contábil-real', value: -passivo.ajuste_tipo4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel-green p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💰</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider">Passivo Total Ajustado</h3>
      </div>

      <div className="space-y-2 mb-4">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{l.label}</span>
            <span className={`font-mono ${l.positive ? 'text-foreground' : 'text-red-brand'}`}>
              {formatCurrency(l.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 mb-3">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-green-brand">= PREÇO JUSTO DE AQUISIÇÃO</span>
          <span className="text-2xl font-mono font-bold text-green-brand">
            {formatCurrency(passivo.passivo_total_ajustado)}
          </span>
        </div>
      </div>

      <div className="flex justify-between text-sm p-3 rounded-lg bg-green-brand/10 border border-green-brand/20">
        <span className="text-green-brand">Proteção financeira</span>
        <span className="font-mono font-bold text-green-brand">
          {formatCurrency(-passivo.delta_absoluto)} (-{passivo.delta_pct}%)
        </span>
      </div>
    </motion.div>
  );
};

export default PassivoCard;
