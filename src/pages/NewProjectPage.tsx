import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, FileText, BookOpen, Wrench, ScrollText, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  type: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

const dropZones = [
  { id: 'nota_fiscal', icon: FileText, label: 'Notas Fiscais', desc: 'NF-e, DANFE, scans históricos', color: 'text-cyan', borderColor: 'hover:border-cyan/40' },
  { id: 'manual_tecnico', icon: BookOpen, label: 'Manuais Técnicos', desc: 'PDFs fabricante, specs', color: 'text-amber-brand', borderColor: 'hover:border-amber-brand/40' },
  { id: 'laudo_manutencao', icon: Wrench, label: 'Laudos de Manutenção', desc: 'OS, inspeções, laudos', color: 'text-green-brand', borderColor: 'hover:border-green-brand/40' },
  { id: 'edital', icon: ScrollText, label: 'Editais + As-Builts + Eventos', desc: 'Documentos regulatórios', color: 'text-purple-brand', borderColor: 'hover:border-purple-brand/40' },
];

const NewProjectPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [sellerPrice, setSellerPrice] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (type: string, selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles).map(f => ({
      file: f,
      type,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);

    try {
      // 1. Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          target_company: targetCompany,
          seller_price: sellerPrice ? parseFloat(sellerPrice) : null,
          status: 'uploading',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Upload files
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setFiles(prev => prev.map((file, idx) => idx === i ? { ...file, status: 'uploading' } : file));

        const filePath = `${project.id}/${f.type}/${Date.now()}_${f.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, f.file);

        if (uploadError) {
          setFiles(prev => prev.map((file, idx) => idx === i ? { ...file, status: 'error' } : file));
          console.error('Upload error:', uploadError);
          continue;
        }

        await supabase.from('documents').insert({
          project_id: project.id,
          type: f.type,
          filename: f.file.name,
          file_path: filePath,
          status: 'queued',
        });

        setFiles(prev => prev.map((file, idx) => idx === i ? { ...file, status: 'done' } : file));
      }

      // 3. Update project status
      await supabase.from('projects').update({ status: 'processing' }).eq('id', project.id);

      toast.success('Projeto criado! Processamento iniciado.');
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

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
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder='ex: "DD Target Nordeste Q2 2026"' className="bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Empresa target</label>
            <Input value={targetCompany} onChange={e => setTargetCompany(e.target.value)} placeholder="Nome da empresa sendo analisada" className="bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Preço declarado pelo vendedor (R$)</label>
            <Input type="number" value={sellerPrice} onChange={e => setSellerPrice(e.target.value)} placeholder="850000000" className="bg-muted/30 border-border font-mono" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!projectName || !targetCompany} className="gap-2">
              Próximo <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm text-muted-foreground">Faça upload de todos os documentos disponíveis. Quanto mais documentos, maior a cobertura da Due Diligence.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dropZones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => fileInputRefs.current[zone.id]?.click()}
                className={`glass-panel p-6 border-dashed border-2 border-border ${zone.borderColor} transition-colors cursor-pointer flex flex-col items-center text-center gap-3`}
              >
                <Upload className={`w-8 h-8 ${zone.color}`} />
                <div>
                  <p className={`font-medium ${zone.color}`}>{zone.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{zone.desc}</p>
                </div>
                <p className="text-xs text-muted-foreground">PDF, JPG, TIFF, PNG, XLSX</p>
                <input
                  ref={el => fileInputRefs.current[zone.id] = el}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.tiff,.png,.xlsx,.csv"
                  className="hidden"
                  onChange={e => handleFileSelect(zone.id, e.target.files)}
                />
              </div>
            ))}
          </div>

          {files.length > 0 && (
            <div className="glass-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Nome</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Tamanho</th>
                    <th className="px-3 py-2 text-left text-xs text-muted-foreground">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2 font-mono text-xs">{f.file.name}</td>
                      <td className="px-3 py-2 text-xs capitalize">{f.type.replace('_', ' ')}</td>
                      <td className="px-3 py-2 font-mono text-xs">{(f.file.size / 1024 / 1024).toFixed(1)} MB</td>
                      <td className="px-3 py-2">
                        <span className={
                          f.status === 'done' ? 'status-ready' :
                          f.status === 'uploading' ? 'status-processing' :
                          f.status === 'error' ? 'badge-high' : 'status-complete'
                        }>
                          {f.status === 'done' ? 'ENVIADO' :
                           f.status === 'uploading' ? 'ENVIANDO' :
                           f.status === 'error' ? 'ERRO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {f.status === 'pending' && (
                          <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Zap className="w-4 h-4" /> {isCreating ? 'Criando...' : 'Iniciar Processamento'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NewProjectPage;
