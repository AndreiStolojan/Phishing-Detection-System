import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  Settings,
  LogOut,
  RefreshCw,
  MailX,
  ChevronsUpDown,
} from 'lucide-react';

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
import { springSoft } from '@/lib/motion';
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

function NavItem({ to, label, icon: Icon, sub }) {
  if (sub) {
    return (
      <NavLink
        to={to}
        end={false}
        className={({ isActive }) =>
          cn(
            'ml-4 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors outline-none',
            isActive
              ? 'text-risk-quarantine bg-risk-quarantine-soft'
              : 'text-muted-foreground hover:text-risk-quarantine hover:bg-risk-quarantine-soft/60'
          )
        }
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'block rounded-lg outline-none transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.97 }}
          className={cn(
            'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            !isActive && 'hover:bg-accent'
          )}
        >
          {isActive && (
            <>
              <motion.span
                layoutId="sidebar-active"
                transition={springSoft}
                className="absolute inset-0 rounded-lg bg-primary/12 ring-1 ring-inset ring-primary/15"
              />
              <motion.span
                layoutId="sidebar-accent"
                transition={springSoft}
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
              />
            </>
          )}
          <Icon className="relative h-4.5 w-4.5 shrink-0" />
          <span className="relative">{label}</span>
        </motion.span>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { account, isConnected, syncing, sync } = useMailAccount();

  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/60 backdrop-blur-xl md:flex">
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-5">
        <img src="/logo.png" alt="SecureInbox" className="h-24 w-24 shrink-0 object-contain drop-shadow-sm" />
        <p className="text-[15px] font-semibold tracking-tight">SecureInbox</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Gmail account + sync */}
      <div className="border-t border-border/60 px-3 py-2.5">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Gmail
        </p>
        {isConnected ? (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-safe/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-risk-safe" />
            </span>
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
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
