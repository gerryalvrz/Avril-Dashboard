import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/src/components/Shell';
import ConvexClientProvider from '@/src/components/ConvexClientProvider';

export const metadata: Metadata = {
  title: 'AgentDashboard',
  description: 'Control plane for multi-agent operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          <Shell>{children}</Shell>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
