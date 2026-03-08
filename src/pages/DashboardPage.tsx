import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Box, Zap, DollarSign, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects, useGlobalStats } from '@/hooks/useProjectData';
import { formatCurrency } from '@/lib/format';
import { mockProjects } from '@/data/mockData';

const statusClass: Record<string, string> = {
  uploading: 'status-complete',
  processing: 'status-processing',
  ocr: 'status-processing',
  valuation: 'status-processing',
  gie: 'status-processing',
  atgi: 'status-processing',
  ready: 'status-ready',
  complete: 'status-complete',
  ingesting: 'status-ingesting',
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: stats } = useGlobalStats();

  // Use real data if available, otherwise show mock for demo
  const displayProjects = projects && projects.length > 0 ? projects : [];
  const hasMockDemo = displayProjects.length === 0;

  const metrics = [
    { icon: FolderOpen, label: 'Projetos Ativos', value: stats?.projectCount ?? (hasMockDemo ? mockProjects.length : 0), color: 'text-cyan' },
    { icon: Box, label: 'Ativos Catalogados', value: stats?.assetCount ?? (hasMockDemo ? 893 : 0), color: 'text-cyan' },
    { icon: Zap, label: 'Inferências Geradas', value: stats?.inferenceCount ?? (hasMockDemo ? 34 : 0), color: 'text-amber-brand' },
    { icon: DollarSign, label: 'Passivo Identificado', value: formatCurrency(stats?.passivoTotal ?? (hasMockDemo ? 246000000 : 0)), color: 'text-green-brand' },
  ];

  const allProjects = hasMockDemo ? mockProjects : displayProjects;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projetos de Due Diligence</h2>
        <Button onClick={() => navigate('/projects/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
      </div>

      {projectsLoading ? (
        <div className="glass-panel p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando projetos...</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Projeto</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Target</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Passivo Ajustado</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">Criado em</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {allProjects.map((p: any, i: number) => (
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
                      <span className={statusClass[p.status] ?? 'status-complete'}>{p.status?.toUpperCase()}</span>
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
                {allProjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum projeto encontrado. Crie seu primeiro projeto de Due Diligence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
