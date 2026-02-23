import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/src/components/Shell';

export const metadata: Metadata = {
  title: 'AgentDashboard',
  description: 'Control plane for multi-agent operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
