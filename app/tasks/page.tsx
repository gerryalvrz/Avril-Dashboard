const TASKS = [
  { id: 'T-001', title: 'Deploy landing-A to production', status: 'in_progress', priority: 'high', agent: 'DevAgent' },
  { id: 'T-002', title: 'Scan Aleo grant program', status: 'todo', priority: 'medium', agent: 'ResearchAgent' },
  { id: 'T-003', title: 'Generate token launch threads', status: 'done', priority: 'high', agent: 'AgentMotus' },
  { id: 'T-004', title: 'Audit wallet permissions model', status: 'todo', priority: 'low', agent: '—' },
  { id: 'T-005', title: 'Set up Convex production env', status: 'in_progress', priority: 'medium', agent: 'DevAgent' },
];

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-gray-500/10 text-gray-400',
  in_progress: 'bg-blue-500/10 text-blue-400',
  done: 'bg-green-500/10 text-green-400',
};

const PRIORITY_STYLE: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400',
};

export default function TasksPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Tasks</h2>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors">
          + New Task
        </button>
      </div>
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Agent</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((t) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-muted font-mono text-xs">{t.id}</td>
                <td className="px-5 py-3 text-white">{t.title}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </td>
                <td className={`px-5 py-3 text-xs font-medium ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</td>
                <td className="px-5 py-3 text-muted">{t.agent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
