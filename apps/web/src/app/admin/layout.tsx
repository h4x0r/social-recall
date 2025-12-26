import { AdminGuard } from "@/components/auth/admin-guard";
import Link from "next/link";

export const metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        {/* Admin Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/admin" className="font-display text-xl font-bold">
                  Admin
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                  <Link
                    href="/admin"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Timeline
                  </Link>
                  <Link
                    href="/admin/profiles"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Profiles
                  </Link>
                  <Link
                    href="/admin/network"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Network
                  </Link>
                  <Link
                    href="/admin/reset"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </Link>
                </nav>
              </div>
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to App
              </Link>
            </div>
          </div>
        </header>

        {/* Admin Content */}
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </AdminGuard>
  );
}
