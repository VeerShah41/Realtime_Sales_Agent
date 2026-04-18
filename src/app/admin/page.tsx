import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <main className="page-shell">
      <section className="hero-card slim">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Manage local demo inventory</h1>
          <p>This page edits the browser-stored catalog that the assistant uses on the home page.</p>
        </div>
      </section>
      <AdminPanel />
    </main>
  );
}
