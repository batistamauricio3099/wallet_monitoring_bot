import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import LockScreen from './components/LockScreen';

const AUTH_KEY = 'authenticated';
const PAGE_KEY = 'page';
const SELECTED_BOT_KEY = 'selectedBotId';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [page, setPage] = useState(() => sessionStorage.getItem(PAGE_KEY) || 'bots');
  const [selectedBotId, setSelectedBotId] = useState(() =>
    sessionStorage.getItem(SELECTED_BOT_KEY) || ''
  );

  useEffect(() => {
    setAuthenticated(sessionStorage.getItem(AUTH_KEY) === 'true');
  }, []);

  const goToDashboardWithBot = (bot) => {
    if (bot && bot._id) {
      sessionStorage.setItem(SELECTED_BOT_KEY, bot._id);
      setSelectedBotId(bot._id);
      sessionStorage.setItem(PAGE_KEY, 'dashboard');
      setPage('dashboard');
    }
  };

  const setSelectedBotIdAndPersist = (id) => {
    if (id) sessionStorage.setItem(SELECTED_BOT_KEY, id);
    else sessionStorage.removeItem(SELECTED_BOT_KEY);
    setSelectedBotId(id || '');
  };

  const goToBots = () => {
    sessionStorage.setItem(PAGE_KEY, 'bots');
    setPage('bots');
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LockScreen onUnlock={() => setAuthenticated(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Wallet Monitor</h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.95rem' }}>
              {page === 'bots'
                ? 'Monitor Ethereum wallets. Create bots and click a wallet to view transactions.'
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {page === 'bots' && <Admin onSelectWallet={goToDashboardWithBot} />}
      {page === 'dashboard' && (
        <Dashboard
          selectedBotId={selectedBotId}
          onSelectedBotIdChange={setSelectedBotIdAndPersist}
          onBackToBots={goToBots}
        />
      )}
    </div>
  );
}
