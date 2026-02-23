const WALLETS = [
  { address: '0x7a3…f12', label: 'Treasury', provider: 'Human.tech', balance: '2.4 SOL', permissions: 'Owner + Admin' },
  { address: '0x1b9…a03', label: 'Operations', provider: 'AA Service', balance: '0.8 SOL', permissions: 'Admin + Operator' },
  { address: '0x4e2…d77', label: 'Agent Wallet', provider: 'AA Service', balance: '0.1 SOL', permissions: 'Operator (execute)' },
];

const ACTIVITY = [
  { action: 'Wallet created', wallet: 'Agent Wallet', by: 'Admin', time: '1h ago' },
  { action: 'Permission granted', wallet: 'Operations', by: 'Owner', time: '3h ago' },
  { action: 'Transfer approved', wallet: 'Treasury', by: 'Owner + Admin', time: '1d ago' },
];

export default function WalletsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Wallets</h2>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors">
          + Create Wallet
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {WALLETS.map((w) => (
          <div key={w.address} className="bg-panel border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">{w.label}</span>
              <span className="text-xs text-muted font-mono">{w.address}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{w.balance}</p>
            <p className="text-xs text-muted mb-2">Provider: {w.provider}</p>
            <p className="text-xs text-muted">Permissions: {w.permissions}</p>
          </div>
        ))}
      </div>
      <div className="bg-panel border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Recent Wallet Activity</h3>
        <ul className="space-y-2 text-sm text-muted">
          {ACTIVITY.map((a, i) => (
            <li key={i}>
              <b className="text-white">{a.action}</b> on <code>{a.wallet}</code> by {a.by} — {a.time}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
