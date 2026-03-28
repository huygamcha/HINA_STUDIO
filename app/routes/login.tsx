import { useState } from "react";
import { Form, useActionData, redirect, Link } from "react-router";
import { motion } from "framer-motion";
import { Camera, Eye, EyeOff, Lock } from "lucide-react";
import {
  validateCredentials,
  createUserSession,
} from "~/utils/session.server";

/* ═══════════════════════════════════════════
   META
   ═══════════════════════════════════════════ */
export function meta() {
  return [
    { title: "Login — Tiệm ảnh Hina" },
    { name: "description", content: "Admin login for Tiệm ảnh Hina." },
  ];
}

/* ═══════════════════════════════════════════
   ACTION — validate credentials
   ═══════════════════════════════════════════ */
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please fill in all fields." };
  }

  const isValid = await validateCredentials(email, password);

  if (!isValid) {
    return { error: "Invalid email or password." };
  }

  return createUserSession("/admin/albums");
}

/* ═══════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════ */
export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2  hover: transition-colors"
          >
            <Camera size={24} strokeWidth={1.5} />
            <span className="text-xl font-medium uppercase">
              Tiệm ảnh Hina
            </span>
          </Link>
          <p className=" text-sm font-medium mt-3">
            Studio Administration
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border/50 p-8 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={16} strokeWidth={1.5} className="" />
            <h1 className="text-lg font-medium">Sign In</h1>
          </div>

          {actionData?.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md  text-sm font-medium"
            >
              {actionData.error}
            </motion.div>
          )}

          <Form method="post" className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium "
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@studio.com"
                className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium "
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-md text-sm font-medium placeholder:/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2  hover: transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-fit mx-auto block px-12 py-3 bg-primary text-primary-foreground text-sm font-medium uppercase hover:bg-accent transition-all duration-300 rounded-md cursor-pointer"
            >
              Sign In
            </button>
          </Form>
        </div>

        <p className="text-center mt-6 text-xs  font-medium">
          <Link to="/" className="hover: transition-colors">
            ← Back to Portfolio
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
