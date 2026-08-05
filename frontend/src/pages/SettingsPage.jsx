// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage.jsx — a normal settings page, done properly.
//
// One column, top to bottom, centred on a comfortable measure. No rail, no
// second sidebar, no panes: settings is a list of small self-contained
// decisions, and the shape of the page should say exactly that. AppShell gives
// it the standard padded <main> and the page transition, like the dashboard.
//
// THE UNIT IS THE PANEL. Every group is a bordered block with three parts —
// a header (what this is, plus one line of why), a body of controls, and a
// footer that only exists when there is an action to take. That footer is what
// keeps the page from reading as a document: the eye can find the edge of a
// decision without reading a word.
//
// SAVING IS AN EVENT, NOT A PERMANENT BUTTON. Switches write immediately (they
// are their own confirmation). Anything typed or picked — display name, sync
// depth, digest hour — opens the panel's footer the moment it differs from what
// is stored, and closes it again on save. A greyed-out button you can never
// press teaches nothing; one that arrives says "yes, that counts as an edit".
//
// Colour stays scarce: periwinkle only where you can act or where you are,
// `destructive` only on the two actions that destroy data.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link2, Loader2, Mail, Minus, Plus } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { updateMe, updateAiSettings, updateNotificationSettings, deleteMe } from '@/api/usersApi';
import {
  getGoogleConnectUrl,
  updateMailAccountSettings,
  disconnectMailAccount,
} from '@/api/mailAccountsApi';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

const accountId = (account) => account?.id || account?._id;

// Horizontal padding is written down once so header, body rows and footer all
// sit on the same two vertical lines — that alignment is most of what makes a
// panel look built rather than assembled.
const PANEL_X = 'px-5 sm:px-6';

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

/* ─── Panel scaffolding ───────────────────────────────────────────────────── */

// One settings group. `action` puts a control in the header (used for
// Disconnect, which is always available and is not a "save"); `footer` is the
// action bar at the bottom edge. `flush` hands the body to the caller when its
// rows want to run edge to edge, like the switch lists.
function Panel({ title, purpose, action, footer, danger = false, flush = false, children }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        danger ? 'border-destructive/30' : 'border-border'
      )}
    >
      <header className={cn('flex items-start justify-between gap-6 py-4', PANEL_X)}>
        <div className="min-w-0">
          <h2 className="heading-section">{title}</h2>
          {purpose && <p className="copy-support mt-1">{purpose}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <div className={cn('border-t border-border', !flush && cn('py-5', PANEL_X))}>{children}</div>

      {footer}
    </section>
  );
}

// The action bar that only exists while there is something to save. It grows
// out of the bottom edge of the panel, so the change and the way to commit it
// are never more than a panel apart.
function SaveFooter({ dirty, loading, onSave, children = 'Save changes' }) {
  return (
    <AnimatePresence initial={false}>
      {dirty && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'flex items-center justify-end gap-3 border-t border-border bg-foreground/[0.025] py-3',
              PANEL_X
            )}
          >
            <span className="mr-auto text-xs text-muted-foreground-subtle">Unsaved changes</span>
            <Button className="h-9" onClick={onSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {children}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// A footer that is always there, for actions that are never "dirty" — the one
// irreversible button on the page.
function ActionFooter({ note, children }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-x-6 gap-y-3 border-t border-border bg-foreground/[0.025] py-3',
        PANEL_X
      )}
    >
      {note && <p className="mr-auto max-w-[46ch] text-xs text-muted-foreground">{note}</p>}
      {children}
    </div>
  );
}

/* ─── Small shared pieces ─────────────────────────────────────────────────── */

// A field heading + optional one-line note. One sentence maximum, and only
// where it earns its place — the rejected version drowned every control in a
// paragraph and the page turned into an article.
function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-[560] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="copy-support">{hint}</p>}
    </div>
  );
}

// One switch. The whole row is the label, so the hover tint is honest: the
// entire surface really does toggle the switch. Rows run the full width of the
// panel and are separated by the same hairline as everything else.
function ToggleRow({ id, label, hint, checked, disabled, onCheckedChange, first = false }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-6 py-4 transition-colors',
        'hover:bg-foreground/[0.03]',
        !first && 'border-t border-border',
        PANEL_X
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-[590] text-foreground">{label}</span>
        {hint && <span className="mt-1 block max-w-[52ch] copy-support">{hint}</span>}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </label>
  );
}

/** Small +/- stepper for a number within [min, max]. */
function NumberStepper({ id, value, onChange, min = 1, max = 50 }) {
  const num = Number(value);
  const stepBtn =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-transparent ' +
    'text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.05] hover:text-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Scan fewer emails per sync"
        className={stepBtn}
        disabled={num <= min}
        onClick={() => onChange(Math.max(num - 1, min))}
      >
        <Minus className="h-4 w-4" />
      </button>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-[3.75rem] bg-transparent text-center text-sm font-[590] tabular-nums shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Scan more emails per sync"
        className={stepBtn}
        disabled={num >= max}
        onClick={() => onChange(Math.min(num + 1, max))}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Settings page ───────────────────────────────────────────────────────── */

export function SettingsPage() {
  const { user, patchUser, logout } = useAuth();
  const { account, isConnected, reload } = useMailAccount();

  const [name, setName] = useState(user?.name || '');
  const [maxResults, setMaxResults] = useState(account?.syncMaxResults ?? 10);
  const [digestHour, setDigestHour] = useState(user?.settings?.digestHour ?? 8);

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

  const aiEnabled = Boolean(user?.settings?.aiEnabled);
  const alertsEnabled = Boolean(user?.settings?.alertsEnabled);
  const digestEnabled = user?.settings?.digestEnabled !== false;
  const syncDirty = Number(maxResults) !== account?.syncMaxResults;
  const digestHourDirty = digestHour !== (user?.settings?.digestHour ?? 8);
  const nameDirty = name.trim() !== (user?.name || '') && name.trim().length >= 2;

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
  const deleteAccount = useAsyncAction(async () => {
    await deleteMe();
    toast.success('Your account has been deleted.');
    logout();
  });

  const fail = (message) => (e) => toast.error(e?.message || message);

  return (
    <div className="mx-auto w-full max-w-[48rem]">
      <PageHeader
        title="Settings"
        description="Your account, the mailbox SecureInbox scans, and when it reaches out to you."
        className="border-b border-border pb-6"
        titleClassName="text-[1.75rem] font-[650] tracking-[-0.028em]"
      />

      <div className="mt-8 space-y-6 pb-4">
        {/* ── Profile ──────────────────────────────────────────────────────── */}
        <Panel
          title="Profile"
          purpose="Who you are inside SecureInbox."
          footer={
            <SaveFooter
              dirty={nameDirty}
              loading={saveName.loading}
              onSave={() => saveName.run().catch(fail('Failed to save.'))}
            >
              Save profile
            </SaveFooter>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Display name" htmlFor="name" hint="Used in the emails we send you.">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 bg-transparent"
              />
            </Field>

            {/* Read-only: the sign-in address is the account identity, so it is
                shown as a fact rather than as an editable field. */}
            <Field label="Sign-in email" htmlFor="email" hint="Set by your sign-in provider.">
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="h-10 cursor-default bg-transparent text-muted-foreground opacity-70 focus-visible:ring-0"
              />
            </Field>
          </div>
        </Panel>

        {/* ── Gmail ────────────────────────────────────────────────────────── */}
        {isConnected ? (
          <Panel
            title="Gmail account"
            purpose="The mailbox SecureInbox scans, and how deep each backfill goes."
            action={
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 text-destructive hover:border-input hover:bg-destructive/10 hover:text-destructive"
                    disabled={disconnect.loading}
                  >
                    {disconnect.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Disconnect
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
                      className="bg-destructive-strong text-destructive-foreground hover:bg-destructive-strong/90"
                      onClick={() => disconnect.run().catch(fail('Failed to disconnect.'))}
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            }
            footer={
              <SaveFooter
                dirty={syncDirty}
                loading={saveSync.loading}
                onSave={() => saveSync.run().catch(fail('Failed to save.'))}
              />
            }
          >
            <div className="space-y-6">
              {/* Presence, not a status badge: the live dot sits inside the
                  sentence because the state IS the statement. */}
              <div>
                <p className="flex items-center gap-2.5 text-[0.875rem] text-foreground">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-risk-safe/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-risk-safe" />
                  </span>
                  <span className="truncate font-[590]">{account.email}</span>
                </p>
                <p className="copy-support mt-1.5">
                  Scanning. Last synced {formatDateTime(account.lastSyncedAt)}.
                </p>
              </div>

              <div className="border-t border-border pt-5">
                <Field
                  label="Backfill page size"
                  htmlFor="maxResults"
                  hint="Emails per page while catching up on history. Ongoing sync doesn't use this. 1–50."
                >
                  <NumberStepper
                    id="maxResults"
                    value={maxResults}
                    onChange={setMaxResults}
                    min={1}
                    max={50}
                  />
                </Field>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Gmail account" purpose="The mailbox SecureInbox scans.">
            <div className="py-6 text-center">
              <Mail className="mx-auto h-5 w-5 text-muted-foreground-subtle" />
              <p className="mt-3 text-[0.875rem] font-[590] text-foreground">No mailbox connected</p>
              <p className="copy-support mx-auto mt-1 max-w-[38ch]">
                The dashboard and inbox stay empty until SecureInbox has a mailbox to scan.
              </p>
              <Button
                className="mt-5 h-9"
                onClick={() => connect.run().catch(fail('Failed to connect.'))}
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
          </Panel>
        )}

        {/* ── Detection ────────────────────────────────────────────────────── */}
        <Panel
          title="Detection"
          purpose="Messages are always scored by the built-in security checks. This only changes whether the reasoning is written out."
          flush
        >
          <ToggleRow
            first
            id="ai-toggle"
            label="AI explanations"
            hint="Adds a plain-language reason to every scan, on top of the built-in checks."
            checked={aiEnabled}
            disabled={toggleAi.loading}
            onCheckedChange={(next) => toggleAi.run(next).catch(fail('Failed to update.'))}
          />
        </Panel>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Panel
          title="Notifications"
          purpose="When SecureInbox reaches out to you."
          flush
          footer={
            /* Only the digest hour is ever unsaved here — the two switches
               commit the moment they are flipped. */
            <SaveFooter
              dirty={digestEnabled && digestHourDirty}
              loading={saveDigestHour.loading}
              onSave={() => saveDigestHour.run().catch(fail('Failed to save.'))}
            >
              Save digest time
            </SaveFooter>
          }
        >
          <ToggleRow
            first
            id="alerts-toggle"
            label="Instant phishing alerts"
            hint="Emailed the moment a sync turns up something dangerous."
            checked={alertsEnabled}
            disabled={toggleAlerts.loading}
            onCheckedChange={(next) => toggleAlerts.run(next).catch(fail('Failed to update.'))}
          />
          <ToggleRow
            id="digest-toggle"
            label="Daily security digest"
            hint="One summary a day. Nothing urgent waits for it."
            checked={digestEnabled}
            disabled={toggleDigest.loading}
            onCheckedChange={(next) => toggleDigest.run(next).catch(fail('Failed to update.'))}
          />

          {/* The hour picker only exists while the digest does. */}
          <AnimatePresence initial={false}>
            {digestEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden border-t border-border"
              >
                <div className={cn('space-y-4 py-5', PANEL_X)}>
                  {/* A 24-hour dial instead of a dropdown: the whole day is
                      visible, so choosing a time is one click and reading it
                      back is zero. The sentence above states the choice in
                      words, because "14" alone is not a time. */}
                  <div>
                    <p id="digest-hour-label" className="text-[0.875rem] text-foreground">
                      Your digest arrives at{' '}
                      <span className="font-[620] tabular-nums text-primary">
                        {hourLabel(utcToLocalHour(digestHour))}
                      </span>
                    </p>
                    <p className="copy-support mt-1">
                      {TZ_NAME} ({offsetLabel}) — your local time.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-labelledby="digest-hour-label"
                    className="grid grid-cols-8 gap-1.5 sm:grid-cols-12"
                  >
                    {Array.from({ length: 24 }, (_, h) => {
                      const isActive = utcToLocalHour(digestHour) === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          aria-label={hourLabel(h)}
                          onClick={() => setDigestHour(localToUtcHour(h))}
                          className={cn(
                            'flex h-8 items-center justify-center rounded-md text-xs tabular-nums outline-none transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-ring',
                            isActive
                              ? 'bg-primary font-[620] text-primary-foreground'
                              : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground'
                          )}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        {/* ── Danger zone ──────────────────────────────────────────────────────
            Set apart by a gap, a warm border and a label of its own, so nobody
            arrives at it by momentum on the way down the page. */}
        <div className="pt-6">
          {/* Spelled out rather than `label-overline`, which carries its own
              muted colour — this one label is allowed to be warm. */}
          <p className="mb-3 text-[0.6875rem] font-[560] uppercase tracking-[0.075em] text-destructive/80">
            Danger zone
          </p>
          <Panel
            danger
            title="Delete account"
            purpose="Permanently removes your profile, every synced message and every scan result. No undo, no export."
            footer={
              <ActionFooter note="You will be signed out immediately.">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleteAccount.loading}
                    >
                      {deleteAccount.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Delete account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is permanent and cannot be undone. All your data, emails, and scan
                        results will be deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive-strong text-destructive-foreground hover:bg-destructive-strong/90"
                        onClick={() => deleteAccount.run().catch(fail('Failed to delete account.'))}
                      >
                        Delete My Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </ActionFooter>
            }
          >
            <p className="copy-support">
              Your Gmail connection is revoked as part of this — SecureInbox keeps nothing.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
