import React, { useState } from "react";
import { Coffee, Lock, LogIn, Mail, ShieldCheck, Sparkles, Utensils, Eye, EyeOff } from "lucide-react";
import BrandLogo from "./common/BrandLogo";

type LoginRole = "admin" | "cashier" | "kitchen";

interface LoginScreenProps {
  onLogin: (email: string, pass: string, role: LoginRole) => Promise<void>;
}

const portalRoles: { id: LoginRole; label: string; helper: string }[] = [
  { id: "admin", label: "Admin", helper: "Management office" },
  { id: "cashier", label: "Cashier", helper: "Billing counter" },
  { id: "kitchen", label: "Kitchen", helper: "Preparation display" },
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<LoginRole>("admin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await onLogin(email, password, selectedRole);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials for selected role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF7F2] text-[#2B2B2B]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(200,169,107,0.28),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(111,78,55,0.14),transparent_30%),linear-gradient(135deg,#FAF7F2_0%,#F5EFE6_52%,#EFE3D3_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#C8A96B]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-96 w-96 rounded-full bg-[#6F4E37]/15 blur-3xl" />

      <section className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[55%_45%]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div className="max-w-2xl">
            <div className="mb-14 flex items-center gap-4">
              <BrandLogo size="xl" />
            </div>

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C8A96B]/40 bg-white/55 px-4 py-2 text-xs font-bold text-[#6F4E37] shadow-[0_18px_50px_rgba(111,78,55,0.10)] backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-[#C8A96B]" />
              Premium Restaurant Management Platform
            </div>

            <h1 className="font-display max-w-2xl text-4xl font-black leading-[1.06] tracking-tight text-[#3E2723] sm:text-5xl xl:text-6xl">
              Manage Your Cafe Operations Effortlessly
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#6B5B4D] sm:text-lg">
              Handle orders, tables, kitchen workflows, payments, and business analytics from one beautifully designed platform.
            </p>

            <div className="mt-12 max-w-lg rounded-[2rem] border border-white/70 bg-white/45 p-5 shadow-[0_24px_70px_rgba(111,78,55,0.12)] backdrop-blur-xl">
              <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-transparent shadow-none">
                <BrandLogo size="lg" />
              </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C8A96B]">
                    Royal Coffee House
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5B4638]">
                    A warm, focused portal for front desk, management, and kitchen teams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 pb-12 sm:px-10 lg:px-12 lg:py-12">
          <div className="w-full max-w-[490px] rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[0_32px_90px_rgba(62,39,35,0.18)] backdrop-blur-2xl sm:p-8">
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-start">
                <BrandLogo size="md" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C8A96B]">
                Secure Portal
              </p>
              <h2 className="mt-3 font-display text-3xl font-black tracking-tight text-[#3E2723]">
                Access Cafe Odoo
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#7A6A5D]">
                Select your portal role before entering credentials.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset>
                <legend className="mb-3 block text-xs font-bold uppercase tracking-[0.18em] text-[#7A6A5D]">
                  Select Role
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {portalRoles.map((role) => {
                    const isSelected = selectedRole === role.id;
                    return (
                      <label
                        key={role.id}
                        className={`cursor-pointer rounded-2xl border p-3 transition ${
                          isSelected
                            ? "border-[#6F4E37] bg-[#F5EFE6] shadow-[0_12px_30px_rgba(111,78,55,0.12)]"
                            : "border-[#E6D9C8] bg-white/60 hover:border-[#C8A96B]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="portalRole"
                          value={role.id}
                          checked={isSelected}
                          onChange={() => setSelectedRole(role.id)}
                          className="sr-only"
                        />
                        <span className="flex items-center gap-2 text-sm font-black text-[#3E2723]">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              isSelected ? "border-[#6F4E37]" : "border-[#CDBFAE]"
                            }`}
                          >
                            {isSelected && <span className="h-2 w-2 rounded-full bg-[#6F4E37]" />}
                          </span>
                          {role.label}
                        </span>
                        <span className="mt-1 block pl-6 text-[11px] font-medium text-[#8A7A6E]">
                          {role.helper}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-[#7A6A5D]">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3917F]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3D7C8] bg-white/80 py-4 pl-11 pr-4 text-sm text-[#2B2B2B] outline-none transition placeholder:text-[#B5A899] focus:border-[#6F4E37] focus:bg-white focus:ring-4 focus:ring-[#C8A96B]/20"
                    placeholder={`${selectedRole}@cafeodoo.com`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-[#7A6A5D]">
                  Password
                </label>
                <div className="relative mt-2">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3917F]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3D7C8] bg-white/80 py-4 pl-11 pr-10 text-sm text-[#2B2B2B] outline-none transition placeholder:text-[#B5A899] focus:border-[#6F4E37] focus:bg-white focus:ring-4 focus:ring-[#C8A96B]/20"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3917F] hover:text-[#6F4E37] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2 font-medium text-[#7A6A5D]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D8CBBB] bg-white accent-[#6F4E37]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="font-bold text-[#6F4E37] transition hover:text-[#3E2723]"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6F4E37] to-[#3E2723] px-5 py-4 text-sm font-black text-white shadow-2xl shadow-[#6F4E37]/25 transition duration-200 hover:scale-[1.015] hover:shadow-[#6F4E37]/35 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <LogIn className="h-4 w-4 transition group-hover:translate-x-0.5" />
                {loading ? "Authenticating..." : "Access Cafe Odoo"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
