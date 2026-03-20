import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/src/components/Shell';
import ConvexClientProvider from '@/src/components/ConvexClientProvider';
import WaaPProvider from '@/src/components/WaaPProvider';
import { UIStoreProvider } from '@/src/lib/store';
import ThemeProvider from '@/src/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'AgentDashboard',
  description: 'Control plane for multi-agent operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WaaPProvider>
          <UIStoreProvider>
            <ThemeProvider>
              <ConvexClientProvider>
                <Shell>{children}</Shell>
              </ConvexClientProvider>
            </ThemeProvider>
          </UIStoreProvider>
        </WaaPProvider>
      </body>
    </html>
  );
}
