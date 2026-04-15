import { useState } from 'react';
import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Navbar mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((v) => !v)} onCloseMobile={() => setMobileOpen(false)} />
      <main className="mx-auto max-w-[1400px] p-4">{children}</main>
    </div>
  );
}
