import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, RefreshCw } from 'lucide-react';

import { useMailAccount } from '@/context/MailAccountContext';
import { SidebarContent } from './Sidebar';
import { springSoft, fadeTween } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* Top bar shown on mobile only: hamburger + brand, with sync on the right. */
export function MobileTopbar({ onMenu }) {
  const { isConnected, syncing, sync } = useMailAccount();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background/85 px-2 backdrop-blur-xl md:hidden">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
        <span className="text-sm font-semibold tracking-tight text-foreground">SecureInbox</span>
      </div>

      {isConnected && (
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          aria-label="Sync inbox"
          className={cn(
            'ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60',
            syncing && 'text-primary opacity-70'
          )}
        >
          <RefreshCw className={cn('h-5 w-5', syncing && 'animate-spin')} />
        </button>
      )}
    </header>
  );
}

/* Slide-in drawer (mobile only). Dismissed by backdrop tap, a nav tap, or Escape. */
export function MobileDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTween}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={springSoft}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] overflow-y-auto border-r border-border bg-card shadow-lg"
          >
            <SidebarContent onNavigate={onClose} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
