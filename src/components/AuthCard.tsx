"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setAdminLoggedIn, setUserLoggedIn } from "@/lib/demo-storage";

type AuthCardProps = {
  title: string;
  description: string;
  mode: "user" | "admin";
};

export function AuthCard({ title, description, mode }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    if (mode === "admin") {
      if (email !== "admin@demo.com" || password !== "admin123") {
        setError("Use admin@demo.com / admin123 for the demo.");
        return;
      }
      setAdminLoggedIn(true);
      router.push("/admin");
      return;
    }

    setUserLoggedIn(true);
    router.push("/");
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">{mode === "admin" ? "Admin Access" : "User Access"}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="primary-button">
          {mode === "admin" ? "Login as Admin" : "Login"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/">Back to Home</Link>
        {mode === "admin" ? <span>Demo credentials: admin@demo.com / admin123</span> : <Link href="/admin/login">Admin Login</Link>}
      </div>
    </section>
  );
}
