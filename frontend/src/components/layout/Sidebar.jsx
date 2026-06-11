import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Inbox, ListChecks, Settings, LogOut, ChevronsUpDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarSupport } from './SidebarSupport';
import { useAuth } from '@/hooks/useAuth';
import { useMailAccount } from '@/context/MailAccountContext';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/sender-lists', label: 'Trusted & Blocked', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const initials = (name, email) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
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
            'relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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

function GmailStatus({ onNavigate }) {
  const { account, isConnected } = useMailAccount();

  if (isConnected) {
    return (
      <div className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-safe/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-safe" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-xs font-medium text-foreground">Gmail connected</p>
          <p className="truncate text-[11px] text-muted-foreground">{account.email}</p>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to="/settings"
      onClick={onNavigate}
      className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-risk-quarantine" />
      <span className="text-xs font-medium text-foreground">Gmail not connected</span>
    </NavLink>
  );
}

/*
  Shared sidebar body used both by the static desktop column (<Sidebar />) and
  the mobile slide-in drawer (<MobileDrawer />). `onNavigate` is called whenever
  the user follows a link or opens Support, so the mobile drawer can close itself.
*/
export function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          <img src="/logo.png" alt="SecureInbox" className="h-full w-full object-contain" />
        </div>
        <p className="text-[15px] font-semibold tracking-tight">SecureInbox</p>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Secondary — kept below the primary nav so it doesn't read as a 5th page */}
      <div className="border-t border-border/60 px-3 py-2">
        <SidebarSupport onNavigate={onNavigate} />
      </div>

      {/* Gmail connection status */}
      <div className="border-t border-border/60 px-3 py-2.5">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Gmail
        </p>
        <GmailStatus onNavigate={onNavigate} />
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
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 overflow-y-auto border-r border-border bg-card/60 backdrop-blur-xl md:block">
      <SidebarContent />
    </aside>
  );
}
