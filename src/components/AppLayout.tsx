import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, LogOut, FolderOpen } from 'lucide-react';

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderOpen, label: 'Projetos', path: '/dashboard' },
  ];

  return (
    <div className="min-h-screen bg-background dot-grid">
      {/* Top header */}
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <Shield className="w-6 h-6 text-cyan" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-foreground">Grafter</span>{' '}
            <span className="text-cyan">Asset OS</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            FASE 1 · BETA
          </span>
        </div>

        <div className="flex items-center gap-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                location.pathname === item.path
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-mono text-cyan">
              AN
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
