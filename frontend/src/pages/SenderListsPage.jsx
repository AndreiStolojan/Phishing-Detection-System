import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Globe,
  HelpCircle,
  ListChecks,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, EmptyState } from '@/components/common/states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, bustCache } from '@/hooks/useApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import {
  getSenderLists,
  addSenderListEntry,
  removeSenderListEntry,
} from '@/api/senderListsApi';
import { formatDateTime } from '@/utils/formatDate';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'allow', label: 'Trusted' },
  { key: 'block', label: 'Blocked' },
];

function SummaryCard({ icon: Icon, label, value, tone, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: index * 0.05 }}
      className="h-full"
    >
      <Card className="h-full">
        <CardContent className="flex h-full items-center gap-3 p-4">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone.soft)}>
            <Icon className={cn('h-5 w-5', tone.text)} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ListBadge({ listType }) {
  const trusted = listType === 'allow';
  const Icon = trusted ? ShieldCheck : ShieldOff;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        trusted
          ? 'border-risk-safe/30 bg-risk-safe-soft text-risk-safe'
          : 'border-risk-quarantine/30 bg-risk-quarantine-soft text-risk-quarantine'
      )}
    >
      <Icon className="h-3 w-3" />
      {trusted ? 'Trusted' : 'Blocked'}
    </span>
  );
}

export function SenderListsPage() {
  const { data, loading, error, reload } = useApi(
    () => getSenderLists({ withMatchCounts: true }),
    [],
    'sender-lists-full'
  );
  const entries = useMemo(() => data?.entries || [], [data]);

  const [listType, setListType] = useState('allow');
  const [kind, setKind] = useState('sender');
  const [value, setValue] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const add = useAsyncAction(async () => {
    await addSenderListEntry({ listType, kind, value: value.trim() });
    setValue('');
    bustCache('sender-lists', 'sender-lists-full');
    await reload();
    toast.success(listType === 'allow' ? 'Added to trusted rules.' : 'Added to blocked rules.');
  });

  const handleAdd = () =>
    add.run().catch((e) => toast.error(e.message || 'Failed to add the rule.'));

  const handleRemove = async (entry) => {
    setRemovingId(entry.id);
    try {
      await removeSenderListEntry(entry.id);
      bustCache('sender-lists', 'sender-lists-full');
      await reload();
      toast.success('Rule removed.');
    } catch (e) {
      toast.error(e.message || 'Failed to remove the rule.');
    } finally {
      setRemovingId(null);
    }
  };

  const trustedCount = entries.filter((e) => e.listType === 'allow').length;
  const blockedCount = entries.filter((e) => e.listType === 'block').length;
  const coveredEmails = entries.reduce((acc, e) => acc + (e.matchedEmails ?? 0), 0);

  const visible = entries.filter((entry) => {
    if (filter !== 'all' && entry.listType !== filter) return false;
    if (search && !entry.value.includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trusted & Blocked Rules"
        className="mb-8"
        titleClassName="text-[1.625rem] font-semibold tracking-tight"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={ShieldCheck}
          label="Trusted rules"
          value={trustedCount}
          tone={{ soft: 'bg-risk-safe-soft', text: 'text-risk-safe' }}
          index={0}
        />
        <SummaryCard
          icon={ShieldOff}
          label="Blocked rules"
          value={blockedCount}
          tone={{ soft: 'bg-risk-quarantine-soft', text: 'text-risk-quarantine' }}
          index={1}
        />
        <SummaryCard
          icon={Mail}
          label="Emails covered"
          value={coveredEmails}
          tone={{ soft: 'bg-primary/10', text: 'text-primary' }}
          index={2}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Rules list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">Your rules</CardTitle>
                <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        'relative overflow-hidden rounded-sm px-2.5 py-1 text-xs font-medium outline-none transition-colors',
                        filter === f.key
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {filter === f.key && (
                        <motion.span
                          layoutId="rules-filter-active"
                          transition={springSoft}
                          className="absolute inset-0 rounded-sm bg-primary/12 ring-1 ring-inset ring-primary/15"
                        />
                      )}
                      <span className="relative">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rules…"
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {loading && entries.length === 0 ? (
                <div className="space-y-2 px-5 pb-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <ErrorState message={error} onRetry={reload} />
              ) : visible.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title={entries.length === 0 ? 'No rules yet' : 'No rules match'}
                  description={
                    entries.length === 0
                      ? 'Add a rule on the right, or use the Trust / Block button on any email.'
                      : 'Try a different search or filter.'
                  }
                  className="mx-5 mb-3 border-0 py-10"
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {visible.map((entry) => {
                    const KindIcon = entry.kind === 'domain' ? Globe : Mail;
                    return (
                      <li key={entry.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            entry.listType === 'allow' ? 'bg-risk-safe-soft' : 'bg-risk-quarantine-soft'
                          )}
                        >
                          <KindIcon
                            className={cn(
                              'h-4 w-4',
                              entry.listType === 'allow' ? 'text-risk-safe' : 'text-risk-quarantine'
                            )}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={entry.value}>
                            {entry.value}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {entry.kind === 'domain' ? 'Whole domain' : 'Single sender'}
                            {' · '}added {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                        {entry.matchedEmails != null && (
                          <span
                            className="hidden shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground sm:inline"
                            title="Synced emails from this sender/domain"
                          >
                            {entry.matchedEmails} email{entry.matchedEmails === 1 ? '' : 's'}
                          </span>
                        )}
                        <ListBadge listType={entry.listType} />
                        <button
                          aria-label={`Remove rule for ${entry.value}`}
                          onClick={() => handleRemove(entry)}
                          disabled={removingId === entry.id}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-risk-quarantine-soft hover:text-risk-quarantine disabled:opacity-50"
                        >
                          {removingId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Add rule + how it works */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.14 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add a rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Rule type"
                    value={listType}
                    onChange={(e) => setListType(e.target.value)}
                    className={selectClass}
                  >
                    <option value="allow">Trust</option>
                    <option value="block">Block</option>
                  </select>
                  <select
                    aria-label="Applies to"
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    className={selectClass}
                  >
                    <option value="sender">Sender</option>
                    <option value="domain">Domain</option>
                  </select>
                </div>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && value.trim() && !add.loading) handleAdd();
                  }}
                  placeholder={kind === 'sender' ? 'name@example.com' : 'example.com'}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAdd}
                  disabled={add.loading || !value.trim()}
                >
                  {add.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add rule
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.18 }}
          >
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">How rules work</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <ShieldOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-quarantine" />
                    <span>
                      <span className="font-medium text-foreground/80">Blocked</span> senders and
                      domains are always flagged as likely phishing — no exceptions.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-safe" />
                    <span>
                      <span className="font-medium text-foreground/80">Trusted</span> senders skip
                      the contextual checks, but critical signals (password requests, dangerous
                      attachments) still count in full.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      A sender rule and a domain rule can never contradict each other — the app
                      rejects the conflict so it is always clear which rule applies.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      Rules apply the next time an email is scanned — open an email and press
                      “Scan again” to apply one immediately.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
