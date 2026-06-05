import { useEffect } from 'react';
import { motion } from 'framer-motion';

import { ease, springSoft } from '@/lib/motion';

export function PageTransition({ children }) {
  // Reset scroll on every route change (each route remounts this via key).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: springSoft }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease } }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
