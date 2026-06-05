import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getMailAccounts, syncMailAccount } from '@/api/mailAccountsApi';

const MailAccountContext = createContext(null);

const accountId = (account) => account?.id || account?._id;

export function MailAccountProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  // Bumped after every successful sync so pages can re-fetch their data.
  const [syncVersion, setSyncVersion] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMailAccounts();
      setAccounts(Array.isArray(result) ? result : result?.items || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load mail accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const account = accounts[0] || null;
  const isConnected = Boolean(account);

  const sync = useCallback(async () => {
    if (!account) return null;
    setSyncing(true);
    try {
      const result = await syncMailAccount(accountId(account));
      setLastSync(result);
      setSyncVersion((v) => v + 1);
      await reload();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [account, reload]);

  const value = useMemo(
    () => ({
      accounts,
      account,
      isConnected,
      loading,
      error,
      syncing,
      lastSync,
      syncVersion,
      sync,
      reload,
    }),
    [accounts, account, isConnected, loading, error, syncing, lastSync, syncVersion, sync, reload]
  );

  return <MailAccountContext.Provider value={value}>{children}</MailAccountContext.Provider>;
}

export function useMailAccount() {
  const context = useContext(MailAccountContext);
  if (!context) {
    throw new Error('useMailAccount must be used inside MailAccountProvider.');
  }
  return context;
}
