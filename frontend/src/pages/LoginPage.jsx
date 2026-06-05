import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v) => /\d/.test(v) },
  { label: 'A special character', test: (v) => /[^A-Za-z\d]/.test(v) },
];

function FieldIcon({ icon: Icon }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  );
}

export function LoginPage() {
  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) })),
    [password]
  );
  const passwordValid = passwordChecks.every((c) => c.ok);

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const toggleMode = () => {
    setIsRegistering((prev) => !prev);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) return setError('Please enter your email address.');
    if (isRegistering) {
      if (name.trim().length < 2) return setError('Name must be at least 2 characters.');
      if (!passwordValid) return setError('Please meet all password requirements.');
      if (password !== confirmPassword) return setError('Passwords do not match.');
    } else if (!password) {
      return setError('Please enter your password.');
    }

    setSubmitting(true);
    try {
      if (isRegistering) {
        await register({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Ambient security-themed glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur">
          {/* Brand header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isRegistering
                ? 'Start protecting your inbox with XAI Phishing Shield.'
                : 'Sign in to your XAI Phishing Shield dashboard.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <X className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <FieldIcon icon={User} />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <FieldIcon icon={Mail} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <FieldIcon icon={Lock} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <FieldIcon icon={Lock} />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {isRegistering && password.length > 0 && (
                <motion.ul
                  key="password-rules"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden grid grid-cols-1 gap-1 rounded-lg bg-muted/40 p-3 sm:grid-cols-2"
                >
                  {passwordChecks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        check.ok ? 'text-risk-safe' : 'text-muted-foreground'
                      )}
                    >
                      {check.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {check.label}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegistering ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:underline"
            >
              {isRegistering ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} XAI Phishing Shield — all rights reserved.
        </p>
      </div>
    </div>
  );
}
