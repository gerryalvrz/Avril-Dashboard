import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className="ml-56 mt-14 p-6 min-h-[calc(100vh-3.5rem)]">
        {children}
      </main>
    </>
  );
}
