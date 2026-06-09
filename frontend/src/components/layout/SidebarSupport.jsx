import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { LifeBuoy, Loader2, Check } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { sendContactMessage } from '@/api/contactApi';

/*
  Sidebar "Support" entry. Opens a popup with the contact form that previously
  lived on the Settings page, so support stays reachable from every page.
*/
export function SidebarSupport() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const sentTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (sentTimer.current) clearTimeout(sentTimer.current);
    };
  }, []);

  const contact = useAsyncAction(async () => {
    await sendContactMessage({ subject: subject.trim() || undefined, message: message.trim() });
    setSubject('');
    setMessage('');
    setSent(true);
    toast.success("Message sent — we'll get back to you by email.");
    sentTimer.current = setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 1200);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-lg text-left text-muted-foreground outline-none transition-colors hover:text-foreground"
      >
        <motion.span
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <LifeBuoy className="h-4.5 w-4.5 shrink-0" />
          <span>Support</span>
        </motion.span>
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contact support</AlertDialogTitle>
            <AlertDialogDescription>
              Send us a question and we'll reply to your registered email.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject (optional)</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="How can we help?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Describe your question or issue…"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <Button
              size="sm"
              onClick={() => contact.run().catch((e) => toast.error(e.message || 'Failed to send.'))}
              disabled={contact.loading || message.trim().length === 0 || sent}
              className={sent ? 'text-risk-safe' : ''}
            >
              {contact.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sent ? (
                <Check className="h-4 w-4 text-risk-safe" />
              ) : null}
              {sent ? 'Sent' : 'Send message'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
