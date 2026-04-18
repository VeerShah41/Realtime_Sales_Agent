import { AuthCard } from "@/components/AuthCard";

export default function AdminLoginPage() {
  return (
    <main className="auth-page">
      <AuthCard
        mode="admin"
        title="Admin Login"
        description="Use the demo admin credentials to update the local product storage."
      />
    </main>
  );
}
