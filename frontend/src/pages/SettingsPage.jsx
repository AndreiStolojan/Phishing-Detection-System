import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Sparkles,
  BellRing,
  CalendarDays,
  Clock,
  LifeBuoy,
  Loader2,
  Trash2,
  Link2,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useMailAccount } from '@/context/MailAccountContext';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { updateMe, updateAiSettings, updateNotificationSettings } from '@/api/usersApi';
import {
  getGoogleConnectUrl,
  updateMailAccountSettings,
  disconnectMailAccount,
} from '@/api/mailAccountsApi';
import { sendContactMessage } from '@/api/contactApi';
import { formatDateTime } from '@/utils/formatDate';
import { springSoft } from '@/lib/motion';

const accountId = (account) => account?.id || account?._id;

/*
  The digest hour is stored in UTC on the backend, but users think in their own
  local time. We show the picker in the browser's timezone and convert to/from
  UTC behind the scenes, using the current offset (good enough for a daily job).
*/
const TZ_NAME = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const OFFSET_HOURS = Math.round(-new Date().getTimezoneOffset() / 60);
const utcToLocalHour = (utc) => (((Number(utc) + OFFSET_HOURS) % 24) + 24) % 24;
const localToUtcHour = (local) => (((Number(local) - OFFSET_HOURS) % 24) + 24) % 24;
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;
const offsetLabel = OFFSET_HOURS === 0
  ? 'UTC'
  : `UTC${OFFSET_HOURS > 0 ? '+' : '−'}${Math.abs(OFFSET_HOURS)}`;

function Section({ icon: Icon, title, description, children, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: Math.min(index * 0.05, 0.25) }}
    >
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function SettingToggle({ id, icon: Icon, title, description, checked, onChange, disabled, caption }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-accent/40">
      <label htmlFor={id} className="flex cursor-pointer gap-3">
        <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {caption && <p className="text-xs text-muted-foreground/70 italic">{caption}</p>}
        </div>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/** Small +/- stepper for a number within [min, max]. */
function NumberStepper({ id, value, onChange, min = 1, max = 50 }) {
  const num = Number(value);
  return (
    <div className="flex items-center gap-1">
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Increase"
          className="flex h-5 w-6 items-center justify-center rounded-t border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={num >= max}
          onClick={() => onChange(Math.min(num + 1, max))}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Decrease"
          className="flex h-5 w-6 items-center justify-center rounded-b border-x border-b border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={num <= min}
          onClick={() => onChange(Math.max(num - 1, min))}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, patchUser } = useAuth();
  const { account, isConnected, reload } = useMailAccount();

  const [name, setName] = useState(user?.name || '');
  const [maxResults, setMaxResults] = useState(account?.syncMaxResults ?? 10);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const contactSentTimer = useRef(null);

  useEffect(() => {
    if (account?.syncMaxResults != null) {
      setMaxResults(account.syncMaxResults);
    }
  }, [account?.syncMaxResults]);

  useEffect(() => {
    if (user?.settings?.digestHour != null) {
      setDigestHour(user.settings.digestHour);
    }
  }, [user?.settings?.digestHour]);

  // Clean up the timer on unmount
  useEffect(() => {
    return () => {
      if (contactSentTimer.current) clearTimeout(contactSentTimer.current);
    };
  }, []);

  const aiEnabled = Boolean(user?.settings?.aiEnabled);
  const alertsEnabled = Boolean(user?.settings?.alertsEnabled);
  const digestEnabled = user?.settings?.digestEnabled !== false;
  const [digestHour, setDigestHour] = useState(user?.settings?.digestHour ?? 8);
  const syncDirty = Number(maxResults) !== account?.syncMaxResults;
  const digestHourDirty = digestHour !== (user?.settings?.digestHour ?? 8);

  const saveName = useAsyncAction(async () => {
    const updated = await updateMe({ name: name.trim() });
    patchUser({ name: updated.name });
    toast.success('Profile saved.');
  });
  const toggleAi = useAsyncAction(async (next) => {
    const result = await updateAiSettings(next);
    patchUser({ settings: { ...user?.settings, aiEnabled: result.aiEnabled } });
    toast.success(result.aiEnabled ? 'AI explanations enabled.' : 'AI explanations disabled.');
  });
  const toggleAlerts = useAsyncAction(async (next) => {
    const result = await updateNotificationSettings({ alertsEnabled: next });
    patchUser({ settings: { ...user?.settings, alertsEnabled: result.alertsEnabled } });
    toast.success(result.alertsEnabled ? 'Phishing alerts enabled.' : 'Phishing alerts disabled.');
  });
  const toggleDigest = useAsyncAction(async (next) => {
    const result = await updateNotificationSettings({ digestEnabled: next });
    patchUser({ settings: { ...user?.settings, digestEnabled: result.digestEnabled } });
    toast.success(result.digestEnabled ? 'Daily digest enabled.' : 'Daily digest disabled.');
  });
  const saveDigestHour = useAsyncAction(async () => {
    const result = await updateNotificationSettings({ digestHour });
    patchUser({ settings: { ...user?.settings, digestHour: result.digestHour } });
    toast.success('Digest time saved.');
  });
  const saveSync = useAsyncAction(async () => {
    await updateMailAccountSettings(accountId(account), Number(maxResults));
    await reload();
    toast.success('Sync settings saved.');
  });
  const connect = useAsyncAction(async () => {
    const result = await getGoogleConnectUrl();
    const url = result?.authUrl || result?.url;
    if (url) window.location.href = url;
  });
  const disconnect = useAsyncAction(async () => {
    await disconnectMailAccount(accountId(account));
    await reload();
    toast.success('Gmail disconnected.');
  });
  const contact = useAsyncAction(async () => {
    await sendContactMessage({ subject: subject.trim() || undefined, message: message.trim() });
    setSubject('');
    setMessage('');
    setContactSent(true);
    toast.success("Message sent — we'll get back to you by email.");
    contactSentTimer.current = setTimeout(() => setContactSent(false), 3000);
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Manage your account, Gmail connection, and detection preferences." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        {/* Profile */}
        <Section icon={User} title="Profile" description="Your account details." index={0}>
        <div className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
            <Label htmlFor="name" className="text-sm text-muted-foreground">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="cursor-default text-muted-foreground opacity-60 hover:border-border focus-visible:ring-0"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => saveName.run().catch((e) => toast.error(e.message || 'Failed to save.'))}
              disabled={saveName.loading || name.trim().length < 2 || name.trim() === user?.name}
            >
              {saveName.loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </div>
      </Section>

      {/* Gmail */}
      <Section
        icon={Mail}
        title="Gmail account"
        description="Connect Gmail to sync and scan your inbox for phishing."
        index={1}
      >
        {isConnected ? (
          <div className="space-y-4">
            {/* Connected status tile */}
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-safe/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-risk-safe" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{account.email}</p>
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatDateTime(account.lastSyncedAt)}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                Up to {account.syncMaxResults ?? maxResults} emails
              </span>
            </div>

            {/* Sync count stepper */}
            <div className="space-y-1.5">
              <Label htmlFor="maxResults" className="text-sm text-muted-foreground">
                Recent emails to scan per sync (1–50)
              </Label>
              <div className="flex items-center gap-3">
                <NumberStepper
                  id="maxResults"
                  value={maxResults}
                  onChange={setMaxResults}
                  min={1}
                  max={50}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveSync.run().catch((e) => toast.error(e.message || 'Failed to save.'))}
                  disabled={saveSync.loading || !syncDirty}
                >
                  {saveSync.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            <Separator className="my-4" />
            <p className="text-[11px] text-muted-foreground">
              This removes all synced data and scans from SecureInbox.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={disconnect.loading}
                >
                  {disconnect.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Disconnect Gmail
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes <span className="text-foreground/80">{account.email}</span> along with its
                    synced messages and scans from SecureInbox. You can reconnect anytime, but you'll
                    need to sync again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => disconnect.run().catch((e) => toast.error(e.message || 'Failed to disconnect.'))}
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="space-y-4">
            <CardDescription>
              Connect your Gmail to sync and scan your inbox for phishing.
            </CardDescription>
            <Button
              size="sm"
              onClick={() => connect.run().catch((e) => toast.error(e.message || 'Failed to connect.'))}
              disabled={connect.loading}
            >
              {connect.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Connect Gmail
            </Button>
          </div>
        )}
      </Section>
        </div>

        <div className="space-y-4">
        {/* Detection & alerts */}
        <Section
          icon={Sparkles}
          title="Detection & alerts"
          description="Control how SecureInbox analyses messages and notifies you."
          index={2}
        >
        <div className="-mx-2 divide-y divide-border/60">
          <SettingToggle
            id="ai-toggle"
            icon={Sparkles}
            title="AI explanations"
            description="Enable AI-powered analysis for deeper insights and plain-language explanations."
            checked={aiEnabled}
            disabled={toggleAi.loading}
            onChange={(next) => toggleAi.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
            caption={!aiEnabled ? 'Without AI, only the built-in security checks are used.' : undefined}
          />
          <SettingToggle
            id="alerts-toggle"
            icon={BellRing}
            title="Instant phishing alerts"
            description="Email me when a likely-phishing message is detected during a sync."
            checked={alertsEnabled}
            disabled={toggleAlerts.loading}
            onChange={(next) => toggleAlerts.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
          />
          <SettingToggle
            id="digest-toggle"
            icon={CalendarDays}
            title="Daily security digest"
            description="Receive a daily email summary of what SecureInbox found in your inbox."
            checked={digestEnabled}
            disabled={toggleDigest.loading}
            onChange={(next) => toggleDigest.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
          />
          {digestEnabled && (
            <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 pl-9 transition-colors hover:bg-accent/40">
              <label htmlFor="digest-hour" className="flex cursor-pointer gap-3">
                <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Delivery time</p>
                  <p className="text-xs text-muted-foreground">
                    When you'll get the digest each day, in your local time.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Your timezone: {TZ_NAME} ({offsetLabel})
                  </p>
                </div>
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="digest-hour"
                  value={utcToLocalHour(digestHour)}
                  onChange={(e) => setDigestHour(localToUtcHour(Number(e.target.value)))}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveDigestHour.run().catch((e) => toast.error(e.message || 'Failed to save.'))}
                  disabled={saveDigestHour.loading || !digestHourDirty}
                >
                  {saveDigestHour.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Support */}
      <Section icon={LifeBuoy} title="Contact support" description="Send us a question and we'll reply by email." index={3}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Your message will be sent to the SecureInbox team. We'll reply to your registered email.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe your question or issue…"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => contact.run().catch((e) => toast.error(e.message || 'Failed to send.'))}
              disabled={contact.loading || message.trim().length === 0 || contactSent}
              className={contactSent ? 'text-risk-safe' : ''}
            >
              {contact.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : contactSent ? (
                <Check className="h-4 w-4 text-risk-safe" />
              ) : null}
              {contactSent ? 'Sent' : 'Send message'}
            </Button>
          </div>
        </div>
        </Section>
        </div>
      </div>
    </div>
  );
}
