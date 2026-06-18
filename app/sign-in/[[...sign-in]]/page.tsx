import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="auth-screen">
      <div className="auth-grid" />
      <div className="auth-brand">
        <span className="auth-logo">◈</span>
        <span>STOCK<span className="accent">AI</span></span>
        <span className="auth-sub">// TERMINAL</span>
      </div>
      <p className="auth-tagline">Sign in to access your trading command center</p>
      <SignIn />
    </div>
  );
}
