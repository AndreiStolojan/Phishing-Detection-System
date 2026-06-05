import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ease } from './lib/motion';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user" transition={{ ease, duration: 0.26 }}>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            duration={3000}
            theme="dark"
            richColors
          />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>
);
