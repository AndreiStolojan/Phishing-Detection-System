import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, BarChart3, Settings, ShieldCheck, LogOut, RefreshCw, MailX } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useMailAccount } from '@/context/MailAccountContext';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const initials = (name, email) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const { account, isConnected, syncing, sync } = useMailAccount();

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card/40 md:flex sticky top-0 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">XAI Phishing Shield</p>
          <p className="text-[11px] text-muted-foreground">SecureInbox</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Gmail account + sync */}
      <div className="border-t border-border/60 px-3 py-2.5">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Gmail
        </p>
        {isConnected ? (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-safe" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {account.email}
            </span>
            <button
              onClick={sync}
              disabled={syncing}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', syncing && 'animate-spin')} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        ) : (
          <NavLink
            to="/settings"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MailX className="h-3.5 w-3.5 shrink-0" />
            Connect Gmail
          </NavLink>
        )}
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-accent">
            <Avatar>
              <AvatarFallback>{initials(user?.name, user?.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
