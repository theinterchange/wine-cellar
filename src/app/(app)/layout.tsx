import NavBar from "@/components/nav-bar";
import BottomTabs from "@/components/bottom-tabs";
import { SessionProvider } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-stone-50">
        <NavBar />
        <main className="pb-24">{children}</main>
        <BottomTabs />
      </div>
    </SessionProvider>
  );
}
