import React, { useState } from "react";
import { Sparkles, Shield, User, Flame, Key, Mail, Lock, LogIn, Compass } from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup: (name: string, email: string, pass: string, role: 'admin' | 'employee' | 'kitchen') => Promise<void>;
}

export default function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<'admin' | 'employee' | 'kitchen'>("admin");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignup) {
        await onSignup(name, email, password, role);
        setSuccessMsg("Account successfully registered! Switch to Sign In page to verify credentials.");
        setName("");
        setIsSignup(false);
      } else {
        await onLogin(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // One-click quick login for judges / sandbox testing
  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSignup(false);
    setErrorMsg("");
  };

  return (
    <div className="flex h-screen w-full font-sans bg-[#0c0a0f] text-neutral-200">
      
      {/* Visual Accent Left Column (SaaS visual introduction panel) */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-950/40 relative flex-col justify-between p-12 border-r border-neutral-900 overflow-hidden">
        
        {/* Glow Spheres */}
        <div className="absolute top-24 left-24 h-64 w-64 bg-purple-65/15 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-12 right-12 h-64 w-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Product Launcher Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-lg shadow-purple-500/20">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-black text-sm tracking-widest text-white uppercase">CafeFlow POS</span>
        </div>

        {/* Captions */}
        <div className="space-y-4 max-w-md relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            <Sparkles className="h-3.5 w-3.5 pulsing-ring rounded-full" />
            Empowered with Gemini Artificial Intelligence
          </div>

          <h1 className="font-display text-4xl font-black text-white leading-tight tracking-tight">
            High Precision point of sale and kitchen screens.
          </h1>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Unleash real-time kitchen queues (KDS), automated category promotions, sales forecasting AI, dynamic payment gateway QR codes, and cloud ledger backups.
          </p>
        </div>

        {/* Brand foot labels */}
        <div className="text-[10px] text-neutral-500 relative z-10 flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-purple-500" />
          Powered by DeepMind Antigravity framework.
        </div>
      </div>

      {/* Forms & Quick Onboarding logins Right Column */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 md:max-w-xl mx-auto lg:max-w-none lg:w-1/2 overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          <div>
            <h2 className="font-display text-2xl font-black text-white tracking-tight">
              {isSignup ? "Create Sandbox Account" : "Access CafeFlow POS"}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isSignup ? "Onboard your credentials to establish a dining workspace" : "Identify role credentials to connect back into register"}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Employee Name</label>
                <div className="relative mt-1">
                  <User className="absolute top-3 left-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 focus:border-purple-500 outline-none pl-10 pr-4 py-2.5 text-xs text-neutral-200 transition"
                    placeholder="Jessica Vance"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative mt-1 border-neutral-800">
                <Mail className="absolute top-3 left-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-850 focus:border-purple-500 border-neutral-800 outline-none pl-10 pr-4 py-2.5 text-xs text-neutral-200 transition"
                  placeholder="admin@cafeflow.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Security Password</label>
              <div className="relative mt-1">
                <Lock className="absolute top-3 left-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-850 focus:border-purple-500 border-neutral-800 outline-none pl-10 pr-4 py-2.5 text-xs text-neutral-200 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isSignup && (
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Role Setting Selection</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['admin', 'employee', 'kitchen'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as any)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase transition ${
                        role === r ? "bg-purple-600 text-white" : "bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      {r === "employee" ? "cashier" : r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 py-3 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Authenticating Workspace..." : isSignup ? "Create Diner Workspace" : "Open Cash Registry"}
            </button>
          </form>

          {/* Toggle Onboarding link */}
          <div className="text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              {isSignup ? "Already have registered credentials? Sign In" : "Onboard a new branch outlet? Create Account"}
            </button>
          </div>

          {/* HACKATHON BONUS DESIGN - ONE-CLICK DEMO AUTH BUTTONS (JUDGES ASSISTED!) */}
          <div className="border-t border-neutral-900 pt-6 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-purple-500" />
              One-Click Judge Sandbox Login
            </div>
            
            <p className="text-[10px] text-neutral-500">
              Log in with our pre-seeded roles to experience three entirely customized viewpoints!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin@cafeflow.com", "adminpassword")}
                className="py-2 px-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-purple-500/40 hover:bg-neutral-900 text-left text-[11px] transition text-purple-300"
              >
                <span className="font-extrabold uppercase text-[9px] block text-purple-400">Admin Cockpit</span>
                admin@cafeflow.com<br/>
                <span className="text-[10px] text-neutral-400">Pass: adminpassword</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("cashier@cafeflow.com", "cashierpassword")}
                className="py-2 px-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-orange-500/40 hover:bg-neutral-900 text-left text-[11px] transition text-orange-300"
              >
                <span className="font-extrabold uppercase text-[9px] block text-orange-400">Cashier terminal</span>
                cashier@cafeflow.com<br/>
                <span className="text-[10px] text-neutral-400">Pass: cashierpassword</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("kitchen@cafeflow.com", "kitchenpassword")}
                className="py-2 px-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 hover:bg-neutral-900 text-left text-[11px] transition text-emerald-300"
              >
                <span className="font-extrabold uppercase text-[9px] block text-emerald-400">Kitchen Display</span>
                kitchen@cafeflow.com<br/>
                <span className="text-[10px] text-neutral-400">Pass: kitchenpassword</span>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
