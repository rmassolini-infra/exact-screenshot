import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, FileText, BookOpen, Wrench, ScrollText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NewProjectPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const dropZones = [
    { icon: FileText, label: 'Notas Fiscais', desc: 'NF-e, DANFE, scans históricos', color: 'text-cyan' },
    { icon: BookOpen, label: 'Manuais Técnicos', desc: 'PDFs fabricante (ABB, Siemens...)', color: 'text-amber-brand' },
    { icon: Wrench, label: 'Laudos de Manutenção', desc: 'OS, inspeções, relatórios', color: 'text-green-brand' },
    { icon: ScrollText, label: 'Editais + As-Builts + Eventos', desc: 'Documentos regulatórios', color: 'text-purple-brand' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </button>

      <h1 className="text-2xl font-bold">Novo Projeto de Due Diligence</h1>

      <div className="flex items-center gap-3">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>{s}</div>
            <span className={`text-sm ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s === 1 ? 'Identificação' : 'Upload de Documentos'}
            </span>
            {s === 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel-primary p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Nome do projeto</label>
            <Input placeholder='ex: "DD Target Nordeste Q2 2026"' className="bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Empresa target</label>
            <Input placeholder="Nome da empresa sendo analisada" className="bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Preço declarado pelo vendedor (R$)</label>
            <Input type="number" placeholder="850000000" className="bg-muted/30 border-border font-mono" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Data estimada de análise</label>
            <Input type="date" className="bg-muted/30 border-border font-mono" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dropZones.map((zone) => (
              <div key={zone.label} className="glass-panel p-6 border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer flex flex-col items-center text-center gap-3">
                <Upload className={`w-8 h-8 ${zone.color}`} />
                <div>
                  <p className={`font-medium ${zone.color}`}>{zone.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{zone.desc}</p>
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, TIFF, PNG, XLSX</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button onClick={() => navigate('/projects/proj-001')} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Zap className="w-4 h-4" /> Iniciar Processamento
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NewProjectPage;
