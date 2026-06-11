import { useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  Globe,
  ListChecks,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { addSenderListEntry, removeSenderListEntry } from '@/api/senderListsApi';
import { normalizeAddress, normalizeDomain } from '@/lib/senderLists';
import { cn } from '@/lib/utils';

/**
 * Trust/Block quick actions for the sender of the open email. The exact sender
 * address and its whole domain are managed independently (a sender entry beats a
 * domain entry at scan time). List changes only affect future scans, so the
 * parent shows a "Scan again" prompt after each change.
 */
export function SenderListActions({ senderAddress, senderDomain, senderEntry, domainEntry, onChanged }) {
  const [busy, setBusy] = useState(false);

  const address = normalizeAddress(senderAddress);
  const domain = normalizeDomain(senderDomain);
  const match = senderEntry || domainEntry;

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action();
      onChanged?.(message);
    } catch (e) {
      toast.error(e.message || 'Failed to update list.');
    } finally {
      setBusy(false);
    }
  };

  const addEntry = (listType, kind, value) =>
    run(
      () => addSenderListEntry({ listType, kind, value }),
      `${kind === 'sender' ? 'Sender' : 'Domain'} ${listType === 'allow' ? 'trusted' : 'blocked'}.`
    );

  const removeEntry = (entry) =>
    run(
      () => removeSenderListEntry(entry.id),
      `Removed from ${entry.listType === 'allow' ? 'trusted' : 'blocked'} list.`
    );

  if (!address && !domain) return null;

  const triggerLabel = match
    ? match.listType === 'allow'
      ? 'Trusted'
      : 'Blocked'
    : 'Trust / Block';
  const TriggerIcon = match
    ? match.listType === 'allow'
      ? ShieldCheck
      : ShieldOff
    : ListChecks;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          className={cn(
            match?.listType === 'allow' && 'border-risk-safe/40 text-risk-safe hover:text-risk-safe',
            match?.listType === 'block' &&
              'border-risk-quarantine/40 text-risk-quarantine hover:text-risk-quarantine'
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriggerIcon className="h-4 w-4" />}
          {triggerLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {address && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{address}</span>
            </DropdownMenuLabel>
            {senderEntry ? (
              <DropdownMenuItem onClick={() => removeEntry(senderEntry)}>
                <X className="h-4 w-4" />
                Remove from {senderEntry.listType === 'allow' ? 'trusted' : 'blocked'} list
              </DropdownMenuItem>
            ) : domainEntry ? (
              // The domain rule already covers this sender; a contradicting sender
              // rule is rejected by the backend, so don't offer it.
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Already {domainEntry.listType === 'allow' ? 'trusted' : 'blocked'} through the
                domain rule below.
              </p>
            ) : (
              <>
                <DropdownMenuItem onClick={() => addEntry('allow', 'sender', address)}>
                  <ShieldCheck className="h-4 w-4 text-risk-safe" />
                  Trust this sender
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addEntry('block', 'sender', address)}>
                  <ShieldOff className="h-4 w-4 text-risk-quarantine" />
                  Block this sender
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        {address && domain && <DropdownMenuSeparator />}
        {domain && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">{domain}</span>
            </DropdownMenuLabel>
            {domainEntry ? (
              <DropdownMenuItem onClick={() => removeEntry(domainEntry)}>
                <X className="h-4 w-4" />
                Remove from {domainEntry.listType === 'allow' ? 'trusted' : 'blocked'} list
              </DropdownMenuItem>
            ) : (
              <>
                {/* A domain rule may not contradict an existing sender rule — only
                    offer the direction that matches it. */}
                {senderEntry?.listType !== 'block' && (
                  <DropdownMenuItem onClick={() => addEntry('allow', 'domain', domain)}>
                    <ShieldCheck className="h-4 w-4 text-risk-safe" />
                    Trust the whole domain
                  </DropdownMenuItem>
                )}
                {senderEntry?.listType !== 'allow' && (
                  <DropdownMenuItem onClick={() => addEntry('block', 'domain', domain)}>
                    <ShieldOff className="h-4 w-4 text-risk-quarantine" />
                    Block the whole domain
                  </DropdownMenuItem>
                )}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
