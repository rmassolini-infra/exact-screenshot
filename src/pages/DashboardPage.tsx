import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Box, Zap, DollarSign, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockProjects } from '@/data/mockData';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const statusClass: Record<string, string> = {
  ingesting: 'status-ingesting',
  processing: 'status-processing',
  ready: 'status-ready',
  complete: 'status-complete',
};

const DashboardPage = () => {
  const navigate = useNavigate();

  const totalProjects = mockProjects.length;
  const totalAssets = mockProjects.reduce((s, p) => s + p.asset_count, 0);
  const totalInferences = mockProjects.reduce((s, p) => s + p.inference_count, 0);
  const totalPassivo = mockProjects.reduce((s, p) => s + (p.seller_price - (p.passivo_total_ajustado ?? p.seller_price)), 0);

  const metrics = [
    { icon: FolderOpen, label: 'Projetos Ativos', value: totalProjects, color: 'text-cyan' },
    { icon: Box, label: 'Ativos Catalogados', value: totalAssets, color: 'text-cyan' },
    { icon: Zap, label: 'Inferências Geradas', value: totalInferences, color: 'text-amber-brand' },
    { icon: DollarSign, label: 'Passivo Identificado', value: formatCurrency(totalPassivo), color: 'text-green-brand' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel-cyan p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Projects header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projetos de Due Diligence</h2>
        <Button onClick={() => navigate('/projects/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
      </div>

      {/* Projects table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Projeto</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Target</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Ativos</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Risco</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Passivo Ajustado</th>
                <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {mockProjects.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.target_company}</td>
                  <td className="px-4 py-3">
                    <span className={statusClass[p.status]}>{p.status.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{p.asset_count}</td>
                  <td className="px-4 py-3">
                    <span className={`badge-${p.avg_risk.toLowerCase()}`}>{p.avg_risk}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {p.passivo_total_ajustado ? formatCurrency(p.passivo_total_ajustado) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
