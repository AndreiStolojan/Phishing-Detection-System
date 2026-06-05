import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Inbox, BarChart3, Settings } from 'lucide-react';

import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 pb-2 pt-2.5 text-[10px] font-medium"
        >
          {({ isActive }) => (
            <>
              <motion.span
                whileTap={{ scale: 0.88 }}
                className="relative flex h-8 w-12 items-center justify-center rounded-xl"
              >
                {isActive && (
                  <motion.span
                    layoutId="bottomnav-active"
                    transition={springSoft}
                    className="absolute inset-0 rounded-xl bg-primary/15"
                  />
                )}
                <Icon
                  className={cn(
                    'relative h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </motion.span>
              <span className={cn('transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
