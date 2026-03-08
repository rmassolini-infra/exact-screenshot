import { useState, useRef, useEffect } from 'react';
import { Send, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RagMessage } from '@/types/grafter';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRagMessages } from '@/hooks/useProjectData';
import { useQueryClient } from '@tanstack/react-query';

const suggestedQueries = [
  'Qual o valor de reposição dos ativos pré-2015?',
  'Quais ativos estão com manutenção em atraso?',
  'Fabricantes com mais de 40% de concentração?',
  'Histórico de penalidades ANEEL do parque?',
  'Quais NFs têm inconsistência com os laudos?',
];

const RagChat = ({ projectId }: { projectId: string }) => {
  const { data: dbMessages } = useProjectRagMessages(projectId);
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      // Save user message
      await supabase.from('rag_messages').insert({
        project_id: projectId,
        role: 'user',
        content: question,
      });

      // Simulated assistant response (will be replaced by Edge Function)
      const assistantContent = `Analisando o acervo documental para responder: "${question}"\n\nEsta é uma resposta simulada. Em produção, a resposta será gerada pelo motor RAG com base nos documentos indexados do projeto.`;

      await supabase.from('rag_messages').insert({
        project_id: projectId,
        role: 'assistant',
        content: assistantContent,
        confidence: 0.85,
        needs_human_review: false,
        sources: [{ doc_name: 'Exemplo', page: 1 }],
      });

      queryClient.invalidateQueries({ queryKey: ['rag_messages', projectId] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-[600px]">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan" />
          <span className="font-semibold text-sm">RAG Agêntico + GraphRAG</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Consulte o acervo documental em linguagem natural · Fontes citadas em cada resposta</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Faça uma pergunta sobre os documentos do projeto.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/30 border border-border'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-3 h-3 text-cyan" />
                  <span className="text-[10px] font-mono text-cyan">Grafter RAG · Agêntico</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.sources && (msg.sources as any[]).length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-1">📎 Fontes citadas:</p>
                  {(msg.sources as any[]).map((s: any, i: number) => (
                    <span key={i} className="text-[10px] font-mono text-muted-foreground block">
                      · {s.doc_name}, pág. {s.page}
                    </span>
                  ))}
                </div>
              )}
              {msg.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Confiança:</span>
                  <div className="w-20 h-1 rounded-full bg-muted/50">
                    <div
                      className={`h-full rounded-full ${msg.confidence >= 0.85 ? 'bg-green-brand' : msg.confidence >= 0.7 ? 'bg-amber-brand' : 'bg-red-brand'}`}
                      style={{ width: `${msg.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono">{Math.round(msg.confidence * 100)}%</span>
                  {msg.needs_human_review && (
                    <span className="text-[10px] text-amber-brand">⚠ Requer revisão</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Analisando documentos...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {suggestedQueries.map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="text-[10px] px-2 py-1 rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pergunte sobre os documentos do projeto..."
          className="bg-muted/30 border-border"
          disabled={isLoading}
        />
        <Button onClick={handleSend} size="icon" className="shrink-0" disabled={isLoading}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default RagChat;
