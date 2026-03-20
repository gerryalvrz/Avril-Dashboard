'use client';

type EventItem = {
  _id: string;
  type: string;
  createdAt: string;
  payload?: unknown;
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export default function SessionTimeline({ events }: { events: EventItem[] }) {
  return (
    <div className="glass rounded-2xl p-4 h-[360px] overflow-y-auto">
      <h4 className="text-sm font-semibold mb-3 font-heading">Live Events</h4>
      <div className="space-y-2">
        {events.length === 0 && <p className="text-xs text-muted">No events yet.</p>}
        {events.map((e) => (
          <div key={e._id} className="border border-white/10 rounded-lg p-2 bg-black/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white">{e.type}</p>
              <p className="text-[10px] text-muted">{formatTime(e.createdAt)}</p>
            </div>
            {Boolean(e.payload) && (
              <pre className="mt-1 text-[10px] text-muted overflow-x-auto whitespace-pre-wrap">
                {String(JSON.stringify(e.payload, null, 2))}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
