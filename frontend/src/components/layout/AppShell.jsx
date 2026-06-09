import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { MailAccountProvider } from '@/context/MailAccountContext';
import { Sidebar } from './Sidebar';
import { MobileTopbar, MobileDrawer } from './MobileNav';
import { PageTransition } from './PageTransition';

export function AppShell() {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <MailAccountProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar onMenu={() => setNavOpen(true)} />
          <main className="flex min-w-0 flex-1 flex-col px-5 py-6 md:py-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition key={location.pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      <MobileDrawer open={navOpen} onClose={() => setNavOpen(false)} />
    </MailAccountProvider>
  );
}
