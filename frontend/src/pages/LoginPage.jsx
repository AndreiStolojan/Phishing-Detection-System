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
import { ease, springSnappy, springSoft, staggerChild, staggerParent } from '@/lib/motion';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v) => /\d/.test(v) },
  { label: 'A special character', test: (v) => /[^A-Za-z\d]/.test(v) },
];

const STRENGTH_HEX = ['var(--color-risk-quarantine)', 'var(--color-risk-review)', 'var(--color-risk-safe)'];
const strengthColor = (n) => (n <= 2 ? STRENGTH_HEX[0] : n <= 4 ? STRENGTH_HEX[1] : STRENGTH_HEX[2]);

function FieldIcon({ icon: Icon }) {
  return (
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  );
}

const collapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.22, ease },
};

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
  const strength = passwordChecks.filter((c) => c.ok).length;

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
        <div className="absolute left-1/2 top-[-12%] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[8%] h-[360px] w-[360px] rounded-full bg-primary/[0.06] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springSoft}
        className="relative w-full max-w-[400px]"
      >
        <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <motion.div {...staggerParent(0.06)}>
            {/* Brand header */}
            <motion.div {...staggerChild} className="mb-6 flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-3xl" />
                <img src="/logo.png" alt="SecureInbox" className="relative h-64 w-64 object-contain drop-shadow-xl" />
              </div>
              <h1 className="text-h2 font-bold tracking-tight">
                {isRegistering ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRegistering
                  ? 'Start protecting your inbox with SecureInbox.'
                  : 'Sign in to your SecureInbox dashboard.'}
              </p>
            </motion.div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  {...collapse}
                  role="alert"
                  className="overflow-hidden"
                >
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form {...staggerChild} onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence initial={false}>
                {isRegistering && (
                  <motion.div {...collapse} className="overflow-hidden">
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
                  </motion.div>
                )}
              </AnimatePresence>

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
                    autoFocus
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

              <AnimatePresence initial={false}>
                {isRegistering && (
                  <motion.div {...collapse} className="overflow-hidden">
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
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {isRegistering && password.length > 0 && (
                  <motion.div {...collapse} className="space-y-2 overflow-hidden">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: i < strength ? strengthColor(strength) : 'var(--color-muted)',
                          }}
                        />
                      ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-1 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                      {passwordChecks.map((check) => (
                        <li
                          key={check.label}
                          className={cn(
                            'flex items-center gap-1.5 text-xs',
                            check.ok ? 'text-risk-safe' : 'text-muted-foreground'
                          )}
                        >
                          {check.ok ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springSnappy}>
                              <Check className="h-3.5 w-3.5" />
                            </motion.span>
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRegistering ? 'Create account' : 'Sign in'}
              </Button>
            </motion.form>

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
          </motion.div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your inbox, with a security layer. © {new Date().getFullYear()} SecureInbox.
        </p>
      </motion.div>
    </div>
  );
}
