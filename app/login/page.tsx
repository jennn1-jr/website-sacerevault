"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/authStore";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      router.push("/dashboard");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      setError(
        axiosError.response?.data?.message || "Gagal masuk. Silakan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Selamat Datang Kembali
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Masuk untuk mengakses brankas aman Anda
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Alamat Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@gmail.com"
            />
            <Input
              label="Login Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Masuk
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-500 hover:text-blue-400"
          >
            Buat akun baru
          </Link>
        </p>
      </div>
    </div>
  );
}
