import { useEffect, useState } from 'react';
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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

const accountId = (account) => account?.id || account?._id;

function SettingToggle({ icon: Icon, title, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4.5 w-4.5 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function SettingsPage() {
  const { user, patchUser, refreshUser } = useAuth();
  const { account, isConnected, reload } = useMailAccount();

  const [name, setName] = useState(user?.name || '');
  const [maxResults, setMaxResults] = useState(account?.syncMaxResults ?? 10);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Sync maxResults when the mail account loads or changes.
  useEffect(() => {
    if (account?.syncMaxResults != null) {
      setMaxResults(account.syncMaxResults);
    }
  }, [account?.syncMaxResults]);

  const aiEnabled = Boolean(user?.settings?.aiEnabled);
  const alertsEnabled = Boolean(user?.settings?.alertsEnabled);

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
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Gmail */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Gmail account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-sm font-medium">{account.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Last sync: {formatDateTime(account.lastSyncedAt)}
                  </p>
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
                      onClick={() => saveSync.run()}
                      disabled={saveSync.loading}
                    >
                      {saveSync.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
                <Separator />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => disconnect.run().catch((e) => toast.error(e.message || 'Failed to disconnect.'))}
                  disabled={disconnect.loading}
                >
                  {disconnect.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Disconnect Gmail
                </Button>
              </>
            ) : (
              <>
                <CardDescription>
                  Connect your Gmail to sync and scan your inbox for phishing.
                </CardDescription>
                <Button size="sm" onClick={() => connect.run().catch((e) => toast.error(e.message || 'Failed to connect.'))} disabled={connect.loading}>
                  {connect.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Connect Gmail
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detection & alerts */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Detection &amp; alerts</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 py-0">
            <SettingToggle
              icon={Sparkles}
              title="AI explanations"
              description="Use the local AI model for semantic signals and plain-language explanations."
              checked={aiEnabled}
              disabled={toggleAi.loading}
              onChange={(next) => toggleAi.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
            />
            <SettingToggle
              icon={BellRing}
              title="Instant phishing alerts"
              description="Email me when a likely-phishing message is detected during a sync."
              checked={alertsEnabled}
              disabled={toggleAlerts.loading}
              onChange={(next) => toggleAlerts.run(next).catch((e) => toast.error(e.message || 'Failed to update.'))}
            />
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Contact support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe your question or issue…"
                className="flex w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
