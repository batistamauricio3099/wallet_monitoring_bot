import { useState, useEffect } from 'react';

const BOTS_API = '/api/bots';
const WALLETS_API = '/api/wallets';
const POLL_MS = 6000;

const IN_ICON = '📥';
const OUT_ICON = '📤';

function getBotEthAddress(bot) {
  const raw = bot?.walletEthereum || bot?.walletAddress || '';
  return (raw && String(raw).trim()) ? String(raw).trim() : null;
}

const DATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'year', label: 'This year' },
  { id: 'month', label: 'This month' },
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
];

export default function Dashboard({ selectedBotId, onSelectedBotIdChange, onBackToBots }) {
  const [bots, setBots] = useState([]);
  const [ethWallet, setEthWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const selectedBot = bots.find((b) => b._id === selectedBotId);
  const ethAddr = selectedBot ? getBotEthAddress(selectedBot) : null;

  const loadBots = async () => {
    try {
      const res = await fetch(BOTS_API);
      if (!res.ok) throw new Error('Failed to load bots');
      const data = await res.json();
      setBots(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    if (bots.length > 0 && selectedBotId && !selectedBot && onSelectedBotIdChange) {
      onSelectedBotIdChange('');
    }
  }, [bots.length, selectedBotId, selectedBot, onSelectedBotIdChange]);

  const loadEthWallet = async (addr) => {
    if (!addr || !addr.trim()) return;
    try {
      const res = await fetch(`${WALLETS_API}/${encodeURIComponent(addr)}`);
      if (!res.ok) return;
      const data = await res.json();
      setEthWallet(data);
    } catch (_) {
      setEthWallet(null);
    }
  };

  useEffect(() => {
    if (ethAddr) {
      setLoading(true);
      loadEthWallet(ethAddr).finally(() => setLoading(false));
    } else {
      setEthWallet(null);
    }
  }, [ethAddr]);

  useEffect(() => {
    if (!ethAddr) return;
    const id = setInterval(() => loadEthWallet(ethAddr), POLL_MS);
    return () => clearInterval(id);
  }, [ethAddr]);

  if (!bots.length) {
    return (
      <div>
        {onBackToBots && (
          <button type="button" onClick={onBackToBots} className="btn btn-ghost btn-icon" style={{ marginBottom: '1.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 6 }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Bots
          </button>
        )}
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <p>No bots yet. Create a bot on the Bots page first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-top-row">
        {onBackToBots && (
          <button type="button" onClick={onBackToBots} className="btn btn-ghost btn-icon" style={{ whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 6 }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Bots
          </button>
        )}
        {selectedBot && ethAddr && (
          <>
            <div className="tx-date-filters tx-date-filters-inline">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDateFilter(f.id)}
                  className={`tx-filter-btn ${dateFilter === f.id ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="tx-summary tx-summary-animate">
              <div className="tx-summary-item tx-summary-wallet-type">
                <strong>Wallet</strong>
                <span className="tx-summary-chain">
                  <img src="/icons/eth.svg" alt="" width="20" height="20" className="tx-summary-chain-icon" />
                  Ethereum
                </span>
              </div>
              <div className="tx-summary-item">
                <strong>Balance</strong>
                <span className="mono">{ethWallet ? (ethWallet.ethBalance || '—') : loading ? '…' : '—'}</span>
              </div>
              <div className="tx-summary-item">
                <strong>Value (USD)</strong>
                <span className="mono">{ethWallet ? (ethWallet.ethValue || '—') : loading ? '…' : '—'}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {error && <div style={{ color: 'var(--warning)', marginBottom: '1rem' }}>{error}</div>}

      {!selectedBotId && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <p>Go to Bots and click a wallet address or &quot;View on Dashboard&quot; to see the wallet here.</p>
        </div>
      )}

      {selectedBot && ethAddr && (
        <>
          {loading && !ethWallet && (
            <div style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Loading…</div>
          )}
          {ethWallet && (
            <div className="card-fade">
              <TransactionsTable
                transactions={ethWallet.transactions || []}
                walletAddress={ethWallet.address}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
              />
            </div>
          )}
          {!ethWallet && !loading && (
            <div style={{ color: 'var(--muted)', marginBottom: '1rem' }}>No wallet data yet. Run the bot to fetch Ethereum transactions.</div>
          )}
          {selectedBot && !ethAddr && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              This bot has no Ethereum address. Add one to see transactions here.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const IST_TZ = 'Asia/Kolkata';

function parseAgeDate(ageStr) {
  if (!ageStr || typeof ageStr !== 'string') return null;
  let trimmed = String(ageStr).trim();
  if (!trimmed) return null;
  trimmed = trimmed.replace(/\s*\(IST\)\s*$/i, '').trim();
  let d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  const isoMatch = trimmed.match(/\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/);
  if (isoMatch) {
    d = new Date(trimmed.replace(/\s+(\d{1,2}):(\d{2}):(\d{2})\s*$/, 'T$1:$2:$3Z'));
    if (!isNaN(d.getTime())) return d;
  }
  d = new Date(trimmed + ' UTC');
  return isNaN(d.getTime()) ? null : d;
}

function formatAgeIST(ageStr) {
  const d = parseAgeDate(ageStr);
  if (!d) return ageStr || '—';
  return d.toLocaleString('en-IN', {
    timeZone: IST_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' (IST)';
}

function ageToAgo(ageStr) {
  const d = parseAgeDate(ageStr);
  if (!d) return ageStr || '—';
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  if (min > 0) return `${min} min ago`;
  if (sec > 0) return `${sec}s ago`;
  return 'just now';
}

function getStartOfDayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - istOffset);
}

function getStartOfWeekIST() {
  const startDay = getStartOfDayIST();
  return new Date(startDay.getTime() - 7 * 24 * 60 * 60 * 1000);
}

function getStartOfMonthIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1) - istOffset);
}

function getStartOfYearIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return new Date(Date.UTC(istNow.getUTCFullYear(), 0, 1) - istOffset);
}

function filterByDateRange(transactions, filterId) {
  if (filterId === 'all') return transactions;
  let start;
  if (filterId === 'today') start = getStartOfDayIST();
  else if (filterId === 'week') start = getStartOfWeekIST();
  else if (filterId === 'month') start = getStartOfMonthIST();
  else if (filterId === 'year') start = getStartOfYearIST();
  else return transactions;
  return transactions.filter((tx) => {
    const d = parseAgeDate(tx.age);
    return d && d >= start;
  });
}

const PAGE_SIZE = 10;
const EXPLORER_BASE = 'https://etherscan.io';
const EXPLORER_TX_PATH = '/tx/';

function TransactionsTable({ transactions, walletAddress, dateFilter = 'all', onDateFilterChange }) {
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...(transactions || [])].sort((a, b) => {
    const da = parseAgeDate(a.age)?.getTime() ?? 0;
    const db = parseAgeDate(b.age)?.getTime() ?? 0;
    return db - da;
  });
  const filtered = filterByDateRange(sorted, dateFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const mainAddr = (walletAddress || '').toLowerCase();

  useEffect(() => {
    setPage(0);
  }, [dateFilter]);

  if (!transactions?.length) {
    return (
      <p style={{ color: 'var(--muted)' }}>No transactions saved yet. When the bot finds new transactions, they will appear here.</p>
    );
  }

  const columns = ['Transaction Hash', 'Method', 'Block', 'Age', 'From', 'In/Out', 'To', 'Amount', 'Amount (USD)', 'Token', 'Txn Fee'];

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {columns.map((col) => (
                <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tx) => {
              const isFromMain = mainAddr && tx.from && tx.from.toLowerCase() === mainAddr;
              const isToMain = mainAddr && tx.to && tx.to.toLowerCase() === mainAddr;
              return (
                <tr key={`${tx.transactionHash}-${tx.token || 'eth'}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }} className="mono">
                    <a href={`${EXPLORER_BASE}${EXPLORER_TX_PATH}${tx.transactionHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {tx.transactionHash.slice(0, 10)}…{tx.transactionHash.slice(-8)}
                    </a>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{tx.method || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="mono">{tx.block || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }} title={formatAgeIST(tx.age)}>{ageToAgo(tx.age)}</td>
                  <td style={{ padding: '0.75rem 1rem', ...(isFromMain ? { color: 'var(--accent)', fontWeight: 600 } : {}) }} className="mono" title={tx.from}>
                    {tx.from ? `${tx.from.slice(0, 8)}…${tx.from.slice(-6)}` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {tx.inOut ? (
                      <span className={tx.inOut === 'IN' ? 'flow-in' : tx.inOut === 'OUT' ? 'flow-out' : ''} style={!tx.inOut || (tx.inOut !== 'IN' && tx.inOut !== 'OUT') ? { background: 'rgba(139, 148, 158, 0.2)', color: 'var(--muted)' } : undefined}>
                        {tx.inOut === 'IN' && `${IN_ICON} `}
                        {tx.inOut === 'OUT' && `${OUT_ICON} `}
                        {tx.inOut}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', ...(isToMain ? { color: 'var(--accent)', fontWeight: 600 } : {}) }} className="mono" title={tx.to}>
                    {tx.to ? `${tx.to.slice(0, 8)}…${tx.to.slice(-6)}` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} className="mono">{tx.amount || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="mono">{tx.amountUsd || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{tx.token || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="mono">{tx.txnFee || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Page {safePage + 1} of {totalPages} ({filtered.length} transaction{filtered.length !== 1 ? 's' : ''})
        </span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage <= 0}
              className="btn btn-ghost"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="btn btn-ghost"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
