import { AuthCard } from "@/components/AuthCard";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <AuthCard
        mode="user"
        title="User Login"
        description="Simple demo login for shoppers before they continue to the AI storefront."
      />
    </main>
  );
}
