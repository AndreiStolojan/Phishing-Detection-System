import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { MailAccountProvider, useMailAccount } from '@/context/MailAccountContext';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { PageTransition } from './PageTransition';
import { cn } from '@/lib/utils';

function MobileSync() {
  const { isConnected, syncing, sync } = useMailAccount();
  if (!isConnected) return null;
  return (
    <button
      onClick={sync}
      disabled={syncing}
      aria-label="Sync inbox"
      className={cn(
        'fixed bottom-[72px] right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card shadow-md transition-opacity md:hidden',
        syncing ? 'opacity-60' : 'opacity-100'
      )}
    >
      <RefreshCw className={cn('h-4 w-4 text-foreground', syncing && 'animate-spin')} />
    </button>
  );
}

export function AppShell() {
  const location = useLocation();

  return (
    <MailAccountProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col px-5 py-6 pb-24 md:pb-6">
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
    </MailAccountProvider>
  );
}
