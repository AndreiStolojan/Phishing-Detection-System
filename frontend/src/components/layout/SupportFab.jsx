import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { MessageCircle, Loader2, Check } from 'lucide-react';

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
import { springSoft } from '@/lib/motion';

/*
  Floating support button shown on every page (bottom-right). It hosts the
  contact form that used to live in Settings. On mobile it stacks above the
  sync FAB (which sits at bottom-[5rem]) so the two never overlap.
*/
export function SupportFab() {
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
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSoft}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        aria-label="Contact support"
        className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-primary text-primary-foreground shadow-lg surface-overlay bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6"
      >
        <MessageCircle className="h-5 w-5" />
      </motion.button>

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
