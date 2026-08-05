// ─────────────────────────────────────────────────────────────────────────────
// Sidebar.jsx — coloana de navigare.
//
// Ideea: să nu arate ca un panou lipit lângă aplicaţie, ci ca aceeaşi suprafaţă
// care continuă. De aceea: acelaşi fundal ca pagina, o singură linie subţire de
// separare, fără casete pline sub itemi şi fără majuscule spaţiate (clişeul de
// "dashboard"). Starea activă e text mai luminos + o bară de 2px în culoarea
// interactivă — atât. Culoarea de severitate nu apare niciodată aici; în
// sidebar nu există nimic periculos, doar locuri unde poţi merge.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  UserRoundCheck,
  Settings,
  LogOut,
  PanelLeftClose,
} from 'lucide-react';

import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  clampSidebarWidth,
} from '@/hooks/useSidebarChrome';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarSupport } from './SidebarSupport';
import { useAuth } from '@/hooks/useAuth';
import { useMailAccount } from '@/context/MailAccountContext';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  // "Senders" rather than "Rules": the page is a board of people and
  // domains you have made a call on, and a one-word noun sits in the same
  // register as Dashboard / Inbox / Settings.
  { to: '/sender-lists', label: 'Senders', icon: UserRoundCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const initials = (name, email) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

// Marca e desenată, nu o imagine: logo.png e un plic albastru din paleta veche
// şi ar fi singurul lucru din aplicaţie care nu urmează tokenii.
function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-primary">
      <path
        d="M12 2.75 4.75 5.6v5.5c0 4.36 2.94 8.43 7.25 9.65 4.31-1.22 7.25-5.29 7.25-9.65V5.6L12 2.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m8.9 11.9 2.2 2.2 4-4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavItem({ to, label, icon: Icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative block rounded-md outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring/60',
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <span
          className={cn(
            'relative flex h-8 items-center gap-2.5 rounded-md pl-3 pr-2.5 text-[13px] transition-colors',
            isActive ? 'font-medium' : 'font-normal group-hover:bg-foreground/[0.04]'
          )}
        >
          {isActive && (
            <>
              <motion.span
                layoutId="sidebar-active"
                transition={springSoft}
                className="absolute inset-0 rounded-md bg-foreground/[0.055]"
              />
              <motion.span
                layoutId="sidebar-accent"
                transition={springSoft}
                className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary"
              />
            </>
          )}
          <Icon
            className={cn(
              'relative h-[15px] w-[15px] shrink-0 transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground-subtle'
            )}
          />
          <span className="relative">{label}</span>
        </span>
      )}
    </NavLink>
  );
}

function GmailStatus({ onNavigate }) {
  const { account, isConnected } = useMailAccount();

  if (isConnected) {
    // Backend-ul întoarce `accountEmail`; `email` nu există pe document, aşa că
    // linia ieşea goală. Păstrăm şi varianta scurtă ca plasă de siguranţă.
    const address = account?.accountEmail || account?.email;
    return (
      <div className="flex h-8 items-center gap-2.5 px-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-safe" />
        <p className="min-w-0 truncate text-[12px] text-muted-foreground">
          {address || 'Gmail connected'}
        </p>
      </div>
    );
  }

  return (
    <NavLink
      to="/settings"
      onClick={onNavigate}
      className="flex h-8 items-center gap-2.5 rounded-md px-3 text-[12px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground-subtle" />
      Gmail not connected
    </NavLink>
  );
}

/*
  Shared sidebar body used both by the static desktop column (<Sidebar />) and
  the mobile slide-in drawer (<MobileDrawer />). `onNavigate` is called whenever
  the user follows a link or opens Support, so the mobile drawer can close itself.
*/
export function SidebarContent({ onNavigate, onCollapse }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Brand — same height as the workspace toolbar so the top edge reads as
          one continuous line across the whole window. */}
      <div className="flex h-[53px] items-center gap-2 px-3">
        <Mark />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
          SecureInbox
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Hide sidebar"
            title="Hide sidebar"
            className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground-subtle outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 md:block"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
        <div className="mt-1 pt-1">
          <SidebarSupport onNavigate={onNavigate} />
        </div>
      </nav>

      {/* Footer: account state and identity, one quiet group rather than three
          bordered blocks stacked on each other. */}
      <div className="px-2 pb-2">
        <GmailStatus onNavigate={onNavigate} />

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/60">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[10px] font-semibold text-muted-foreground">
              {initials(user?.name, user?.email)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
              {user?.name || user?.email || 'User'}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
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

export function Sidebar({ width, collapsed, onCollapse, onResize }) {
  const asideRef = useRef(null);
  // Dragging the edge sets width on every pointermove. If the width transition
  // were live during a drag, the column would lag behind the cursor, so the
  // animation is suppressed while dragging and only used for collapse/expand.
  const [dragging, setDragging] = useState(false);

  // Trage de muchia din dreapta. Folosim pointer capture ca gestul să continue
  // chiar dacă mouse-ul iese din zona de 5px — altfel redimensionarea "scapă"
  // de sub cursor de fiecare dată când mişti puţin mai repede.
  const startDrag = useCallback(
    (event) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const left = asideRef.current?.getBoundingClientRect().left ?? 0;
      handle.setPointerCapture?.(event.pointerId);
      setDragging(true);

      const onMove = (e) => onResize(clampSidebarWidth(e.clientX - left));
      const onUp = () => {
        handle.releasePointerCapture?.(event.pointerId);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setDragging(false);
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [onResize]
  );

  const onHandleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      onResize(clampSidebarWidth(width + (e.key === 'ArrowRight' ? 16 : -16)));
    },
    [onResize, width]
  );

  /*
    Collapsing animates the column's width to 0 rather than unmounting it —
    unmounting is what made the old behaviour snap. The inner track keeps its
    full pixel width and is clipped by the parent, so the nav content slides out
    of view intact instead of reflowing narrower and narrower as it goes.

    `inert` + aria-hidden while collapsed keep a zero-width column out of the
    tab order; without it, focus could land on links nobody can see.
    Reduced-motion users get the instant version via the global rule in
    index.css that zeroes every transition-duration.
  */
  return (
    <aside
      ref={asideRef}
      aria-label="Primary"
      aria-hidden={collapsed || undefined}
      inert={collapsed ? true : undefined}
      style={{ width: collapsed ? 0 : width }}
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 bg-background md:block',
        collapsed ? 'border-r-0' : 'border-r border-border/70',
        !dragging && 'transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]'
      )}
    >
      <div className="h-full overflow-hidden">
        <div style={{ width }} className="h-full overflow-y-auto">
          <SidebarContent onCollapse={onCollapse} />
        </div>
      </div>

      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuenow={width}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={onHandleKeyDown}
          className="group absolute inset-y-0 -right-[3px] z-20 w-[6px] cursor-col-resize outline-none"
        >
          {/* Linia se aprinde doar la hover/focus — în rest muchia rămâne o
              hairline obişnuită, ca să nu arate ca un element de UI în plus. */}
          <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-primary opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-100" />
        </div>
      )}
    </aside>
  );
}
