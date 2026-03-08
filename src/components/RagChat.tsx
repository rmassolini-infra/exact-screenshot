import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, FileText, AlertTriangle, CheckCircle2, Sparkles, RotateCcw, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RagMessage } from '@/types/grafter';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRagMessages } from '@/hooks/useProjectData';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const suggestedQueries = [
  { label: 'Valor de reposição pré-2015', query: 'Qual o valor de reposição dos ativos pré-2015?' },
  { label: 'Manutenção em atraso', query: 'Quais ativos estão com manutenção em atraso?' },
  { label: 'Concentração fabricantes', query: 'Fabricantes com mais de 40% de concentração?' },
  { label: 'Penalidades ANEEL', query: 'Histórico de penalidades ANEEL do parque?' },
  { label: 'Inconsistências NF vs Laudos', query: 'Quais NFs têm inconsistência com os laudos?' },
  { label: 'Passivo oculto estimado', query: 'Qual o passivo oculto total estimado e como foi calculado?' },
  { label: 'Ativos CRITICAL', query: 'Liste os ativos com risco CRITICAL e as razões de cada classificação.' },
  { label: 'Divergência depreciação', query: 'Quais ativos têm divergência > 10pp entre depreciação ANEEL e física?' },
];

const RagChat = ({ projectId }: { projectId: string }) => {
  const { data: dbMessages, isLoading: loadingHistory } = useProjectRagMessages(projectId);
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages: RagMessage[] = (dbMessages ?? []).map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    sources: m.sources as any,
    confidence: m.confidence ?? undefined,
    needs_human_review: m.needs_human_review ?? undefined,
  }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSend = async (overrideInput?: string) => {
    const question = (overrideInput ?? input).trim();
    if (!question || isLoading) return;
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: { question, project_id: projectId },
      });

      if (error) {
        console.error('RAG error:', error);
        toast.error('Erro ao consultar o assistente RAG.');
      } else if (data?.error) {
        toast.error(data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['rag_messages', projectId] });
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o assistente RAG.');
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      inputRef.current?.focus();
    }
  };

  const confidenceColor = (c: number) =>
    c >= 0.85 ? 'text-green-brand' : c >= 0.7 ? 'text-amber-brand' : 'text-red-brand';

  const confidenceBg = (c: number) =>
    c >= 0.85 ? 'bg-green-brand' : c >= 0.7 ? 'bg-amber-brand' : 'bg-red-brand';

  const confidenceLabel = (c: number) =>
    c >= 0.9 ? 'Alta' : c >= 0.75 ? 'Moderada' : 'Baixa';

  return (
    <div className="flex flex-col h-[700px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                Grafter RAG Agêntico
                <Badge variant="outline" className="text-[9px] font-mono">GraphRAG + Gemini 2.5</Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Consulte o acervo documental em linguagem natural · Fontes rastreadas em cada resposta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-brand animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-mono">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        <div className="space-y-5">
          {/* Welcome */}
          {messages.length === 0 && !isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold text-base mb-1">Assistente de Due Diligence</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Faça perguntas sobre os documentos, ativos, inferências e riscos do projeto. 
                Cada resposta inclui fontes documentais e nível de confiança.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 max-w-2xl mx-auto">
                {suggestedQueries.slice(0, 4).map(q => (
                  <button
                    key={q.label}
                    onClick={() => handleSend(q.query)}
                    className="text-left text-[11px] px-3 py-2.5 rounded-lg bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-border hover:border-primary/30"
                  >
                    <span className="block font-medium text-foreground/80">{q.label}</span>
                    <span className="block text-[10px] mt-0.5 line-clamp-1">{q.query}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message List */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[75%] rounded-2xl rounded-tr-md px-4 py-3 text-sm bg-primary text-primary-foreground">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[85%] space-y-2">
                    {/* Assistant header */}
                    <div className="flex items-center gap-2 ml-1">
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                        <Brain className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">Grafter RAG</span>
                      {msg.confidence !== undefined && (
                        <span className={`text-[10px] font-mono ${confidenceColor(msg.confidence)}`}>
                          {Math.round(msg.confidence * 100)}% confiança ({confidenceLabel(msg.confidence)})
                        </span>
                      )}
                      {msg.needs_human_review && (
                        <Badge variant="outline" className="text-[9px] text-amber-brand border-amber-brand/30 gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Revisão
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-muted/30 border border-border">
                      <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed
                        prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-sm
                        prose-p:text-foreground/90 prose-strong:text-foreground prose-code:text-primary
                        prose-ul:text-foreground/90 prose-ol:text-foreground/90 prose-li:text-foreground/90">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Confidence bar */}
                      {msg.confidence !== undefined && (
                        <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground">Confiança</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 max-w-[120px]">
                            <div className={`h-full rounded-full ${confidenceBg(msg.confidence)} transition-all`}
                              style={{ width: `${msg.confidence * 100}%` }} />
                          </div>
                          <span className={`text-[10px] font-mono ${confidenceColor(msg.confidence)}`}>
                            {Math.round(msg.confidence * 100)}%
                          </span>
                        </div>
                      )}

                      {/* Sources */}
                      {msg.sources && (msg.sources as any[]).length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Fontes documentais ({(msg.sources as any[]).length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(msg.sources as any[]).map((s: any, i: number) => (
                              <span key={i} className="text-[10px] font-mono px-2 py-1 rounded-md bg-background border border-border text-muted-foreground hover:text-foreground transition-colors">
                                📄 {s.doc_name}{s.page ? `, p.${s.page}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/30"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-green-brand" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => handleSend(messages.find(m => m.id === msg.id)?.content ? 
                          `Elabore mais sobre: ${msg.content.substring(0, 100)}` : '')}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/30"
                      >
                        <RotateCcw className="w-3 h-3" /> Aprofundar
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="max-w-[85%] space-y-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Grafter RAG</span>
                </div>
                <div className="rounded-2xl rounded-tl-md px-4 py-4 bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Analisando acervo documental e inferências...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Quick suggestions (when there are messages) */}
      {messages.length > 0 && !isLoading && (
        <div className="px-5 py-2 border-t border-border/50 flex gap-1.5 overflow-x-auto">
          {suggestedQueries.slice(0, 5).map(q => (
            <button
              key={q.label}
              onClick={() => handleSend(q.query)}
              className="text-[10px] px-2.5 py-1.5 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border whitespace-nowrap shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-border bg-muted/10">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Pergunte sobre documentos, ativos, inferências, riscos..."
              className="bg-background border-border pr-10 h-11"
              disabled={isLoading}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono">
              ⏎
            </span>
          </div>
          <Button onClick={() => handleSend()} size="icon" className="h-11 w-11 shrink-0" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2 font-mono text-center">
          RAG Agêntico com GraphRAG · Gemini 2.5 Flash · Fontes citadas automaticamente · {messages.length} mensagens na sessão
        </p>
      </div>
    </div>
  );
};

export default RagChat;
