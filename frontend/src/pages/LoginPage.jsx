import { Box } from '@mui/material';

import AuthForm from '../components/auth/AuthForm.jsx';

const LoginPage = () => (
  <Box
    component="main"
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      py: 5,
      background: 'linear-gradient(135deg, #0b1120 0%, #111827 55%, #083344 100%)',
    }}
  >
    <AuthForm />
  </Box>
);

export default LoginPage;
