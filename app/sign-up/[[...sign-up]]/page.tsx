import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="auth-screen">
      <div className="auth-grid" />
      <div className="auth-brand">
        <span className="auth-logo">◈</span>
        <span>STOCK<span className="accent">AI</span></span>
        <span className="auth-sub">// TERMINAL</span>
      </div>
      <p className="auth-tagline">Create your account to start analyzing</p>
      <SignUp />
    </div>
  );
}
