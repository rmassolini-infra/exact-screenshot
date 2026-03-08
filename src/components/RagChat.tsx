import { useState, useRef, useEffect } from 'react';
import { Send, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RagMessage } from '@/types/grafter';
import { mockRagMessages } from '@/data/mockData';

const suggestedQueries = [
  'Qual o valor de reposição dos ativos pré-2015?',
  'Quais ativos estão com manutenção em atraso?',
  'Fabricantes com mais de 40% de concentração?',
  'Histórico de penalidades ANEEL do parque?',
];

const RagChat = () => {
  const [messages, setMessages] = useState<RagMessage[]>(mockRagMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: RagMessage = { id: `msg-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulated response
    setTimeout(() => {
      const assistantMsg: RagMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Analisando o acervo documental... Esta é uma resposta simulada para demonstração da interface do RAG Chat. Em produção, a resposta seria gerada pelo Claude com base nos documentos indexados do projeto.',
        sources: [{ doc_name: 'Documento-Exemplo', page: 1 }],
        confidence: 0.89,
        needs_human_review: false,
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 1500);
  };

  return (
    <div className="glass-panel flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan" />
          <span className="font-semibold text-sm">RAG Agêntico + GraphRAG</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Consulte o acervo documental em linguagem natural · Fontes citadas em cada resposta</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 border border-border'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-3 h-3 text-cyan" />
                  <span className="text-[10px] font-mono text-cyan">Grafter RAG · Agêntico</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-1">📎 Fontes citadas:</p>
                  {msg.sources.map((s, i) => (
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
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
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

      {/* Input */}
      <div className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pergunte sobre os documentos do projeto..."
          className="bg-muted/30 border-border"
        />
        <Button onClick={handleSend} size="icon" className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default RagChat;
