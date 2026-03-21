import Badge from '@/src/components/ui/Badge';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import SectionTitle from '@/src/components/ui/SectionTitle';

const TASKS = [
  { id: 'T-001', title: 'Deploy landing-A to production', status: 'in_progress', priority: 'high', agent: 'DevAgent' },
  { id: 'T-002', title: 'Scan Aleo grant program', status: 'todo', priority: 'medium', agent: 'ResearchAgent' },
  { id: 'T-003', title: 'Generate token launch threads', status: 'done', priority: 'high', agent: 'AvrilAgent' },
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
    <div className="font-sans">
      <div className="flex items-center justify-between mb-6">
        <SectionTitle title="Tasks" subtitle="Plan and track execution across Avril agents." />
        <Button className="text-sm">+ New Task</Button>
      </div>
      <Card className="overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-muted text-left">
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Agent</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] smooth-transition">
                <td className="px-5 py-3 text-muted font-mono text-xs">{t.id}</td>
                <td className="px-5 py-3 text-white">{t.title}</td>
                <td className="px-5 py-3">
                  <Badge className={STATUS_STYLE[t.status]}>
                    {t.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className={`px-5 py-3 text-xs font-medium ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</td>
                <td className="px-5 py-3 text-muted">{t.agent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
