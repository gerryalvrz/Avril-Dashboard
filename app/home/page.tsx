const STATS = [
  { label: 'Active Agents', value: '4', icon: '🤖' },
  { label: 'Open Tasks', value: '12', icon: '📋' },
  { label: 'Messages Today', value: '47', icon: '💬' },
  { label: 'Wallets', value: '3', icon: '🔐' },
];

export default function HomePage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="bg-panel border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold text-white">{s.value}</span>
            </div>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-panel border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>🟢 <b className="text-white">AgentMotus</b> completed task <code>deploy-landing</code></li>
          <li>🔵 <b className="text-white">ResearchAgent</b> started run <code>funding-scan-v2</code></li>
          <li>💬 New message in <b className="text-white">#general</b> from Gerry</li>
          <li>🔐 Wallet <code>0x7a3…f12</code> created by <b className="text-white">Admin</b></li>
        </ul>
      </div>
    </div>
  );
}
