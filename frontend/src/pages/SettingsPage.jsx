import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Sparkles,
  BellRing,
  LifeBuoy,
  Loader2,
  Trash2,
  Link2,
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

function Section({ icon: Icon, title, description, children, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: Math.min(index * 0.05, 0.25) }}
    >
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
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

function SettingToggle({ id, icon: Icon, title, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-accent/40">
      <label htmlFor={id} className="flex cursor-pointer gap-3">
        <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
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

  useEffect(() => {
    if (account?.syncMaxResults != null) {
      setMaxResults(account.syncMaxResults);
    }
  }, [account?.syncMaxResults]);

  const aiEnabled = Boolean(user?.settings?.aiEnabled);
  const alertsEnabled = Boolean(user?.settings?.alertsEnabled);
  const syncDirty = Number(maxResults) !== account?.syncMaxResults;

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
    const result = await updateNotificationSettings(next);
    patchUser({ settings: { ...user?.settings, alertsEnabled: result.alertsEnabled } });
    toast.success(result.alertsEnabled ? 'Phishing alerts enabled.' : 'Phishing alerts disabled.');
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
    toast.success("Message sent — we'll get back to you by email.");
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PageHeader title="Settings" description="Manage your account, Gmail connection, and detection preferences." />

      {/* Profile */}
      <Section icon={User} title="Profile" description="Your account details." index={0}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled />
          </div>
          <Button
            size="sm"
            onClick={() => saveName.run().catch((e) => toast.error(e.message || 'Failed to save.'))}
            disabled={saveName.loading || name.trim().length < 2 || name.trim() === user?.name}
          >
            {saveName.loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </Button>
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
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-safe/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-safe" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{account.email}</p>
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatDateTime(account.lastSyncedAt)}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxResults">How many recent emails to scan per sync (1–50)</Label>
              <div className="flex gap-2">
                <Input
                  id="maxResults"
                  type="number"
                  min={1}
                  max={50}
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className="w-28"
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
            <Separator />
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
                    synced messages and scans from SecureInbox. You can reconnect anytime, but you’ll
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
          <div className="space-y-3">
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
            description="Use the local AI model for semantic signals and plain-language explanations."
            checked={aiEnabled}
            disabled={toggleAi.loading}
            onChange={(next) => toggleAi.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
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
        </div>
      </Section>

      {/* Support */}
      <Section icon={LifeBuoy} title="Contact support" description="Send us a question and we’ll reply by email." index={3}>
        <div className="space-y-3">
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
          <Button
            size="sm"
            onClick={() => contact.run().catch((e) => toast.error(e.message || 'Failed to send.'))}
            disabled={contact.loading || message.trim().length === 0}
          >
            {contact.loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send message
          </Button>
        </div>
      </Section>
    </div>
  );
}
