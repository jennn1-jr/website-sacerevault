"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        vaultPassword,
      });
      // Redirect to login after successful registration
      router.push("/login");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      setError(
        axiosError.response?.data?.message ||
          "Pendaftaran gagal. Silakan coba lagi.",
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
            <ShieldAlert className="h-6 w-6 text-blue-500" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Buat Akun Baru
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Bergabung dengan SecureVault untuk mengenkripsi file Anda
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Nama Lengkap"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budi Santoso"
            />
            <Input
              label="Alamat Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anda@perusahaan.com"
            />
            <Input
              label="Password Login"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="Vault Password"
              type="password"
              required
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
              placeholder="••••••••"
            />
            <p className="text-xs text-yellow-500/80 mt-1">
              Password vault digunakan khusus untuk mengenkripsi kunci privat
              RSA Anda dan membuka brankas file Anda. Ini bisa berbeda dari
              password login.
            </p>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Daftar
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-500 hover:text-blue-400"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
