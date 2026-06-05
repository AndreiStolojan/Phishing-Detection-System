import { useEffect } from 'react';
import { motion } from 'framer-motion';

import { dur, ease } from '@/lib/motion';

export function PageTransition({ children }) {
  // Reset scroll on every route change (each route remounts this via key).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.base, ease }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
