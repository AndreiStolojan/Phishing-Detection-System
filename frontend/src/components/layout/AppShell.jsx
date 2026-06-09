import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { MailAccountProvider, useMailAccount } from '@/context/MailAccountContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SupportFab } from './SupportFab';
import { PageTransition } from './PageTransition';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

function MobileSync() {
  const { isConnected, syncing, sync } = useMailAccount();
  return (
    <AnimatePresence>
      {isConnected && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={springSoft}
          whileTap={{ scale: 0.9 }}
          onClick={sync}
          disabled={syncing}
          aria-label="Sync inbox"
          className={cn(
            'fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card surface-overlay md:hidden',
            'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
            syncing && 'opacity-70'
          )}
        >
          <RefreshCw className={cn('h-5 w-5 text-primary', syncing && 'animate-spin')} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function AppShell() {
  const location = useLocation();

  return (
    <MailAccountProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col px-5 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <BottomNav />
      <MobileSync />
      <SupportFab />
    </MailAccountProvider>
  );
}
