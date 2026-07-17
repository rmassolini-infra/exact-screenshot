import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex flex-col">
      {/* Selo de demonstração global — não fechável */}
      <div
        role="status"
        aria-label="Selo de ambiente de demonstração"
        className="w-full bg-amber-brand text-black text-[11px] font-mono font-semibold tracking-wider text-center py-1.5 px-3 border-b border-amber-brand/60 sticky top-0 z-[60]"
      >
        AMBIENTE DE DEMONSTRAÇÃO · DADOS 100% SINTÉTICOS · VISÃO DE PRODUTO (META M12)
      </div>

      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-[26px] z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <Shield className="w-6 h-6 text-cyan" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-foreground">Grafter</span>{' '}
            <span className="text-cyan">DueDD</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            FASE 1 · BETA
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
              location.pathname === '/dashboard'
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <div className="w-px h-6 bg-border" />
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{user?.email}</span>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-mono text-cyan">
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-6 flex-1">
        <Outlet />
      </main>

      {/* Marca d'água discreta de rodapé em todas as telas */}
      <footer className="text-center py-3 text-[10px] font-mono text-muted-foreground/70 border-t border-border/40">
        Grafter DueDD · demo sintética
      </footer>
    </div>
  );
};

export default AppLayout;
