const AGENTS = [
  { name: 'AgentMotus', status: 'active', runs: 23, lastRun: '2 min ago', capability: 'General ops' },
  { name: 'ResearchAgent', status: 'active', runs: 8, lastRun: '15 min ago', capability: 'Funding intel' },
  { name: 'TradingAgent', status: 'paused', runs: 41, lastRun: '1h ago', capability: 'Market analysis' },
  { name: 'DevAgent', status: 'active', runs: 5, lastRun: '30 min ago', capability: 'Code & infra' },
];

export default function AgentsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Agents</h2>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors">
          + Register Agent
        </button>
      </div>
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Capability</th>
              <th className="px-5 py-3 font-medium">Runs</th>
              <th className="px-5 py-3 font-medium">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => (
              <tr key={a.name} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-white font-medium">{a.name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                    a.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted">{a.capability}</td>
                <td className="px-5 py-3 text-muted">{a.runs}</td>
                <td className="px-5 py-3 text-muted">{a.lastRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
