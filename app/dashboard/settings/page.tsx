"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useState } from "react";
import { ShieldAlert, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import Image from "next/image";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/profile"); // We need this endpoint
      return res.data.data;
    },
    retry: false
  });

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/auth/2fa/setup");
      setSetupData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal memulai setup 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      await api.post("/auth/2fa/verify", { token });
      setSuccessMsg("2FA berhasil diaktifkan!");
      setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) {
      setError(err.response?.data?.message || "Token tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin menonaktifkan 2FA? Ini akan menurunkan keamanan akun Anda.");
    if (!confirm) return;
    
    setIsLoading(true);
    try {
      await api.post("/auth/2fa/disable");
      setSuccessMsg("2FA berhasil dinonaktifkan.");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) {
      alert("Gagal menonaktifkan 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Pengaturan Akun</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola keamanan dan preferensi akun Anda.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <KeyRound className="h-6 w-6 text-blue-500" />
          <h2 className="text-lg font-medium text-white">Autentikasi 2 Langkah (2FA)</h2>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-lg text-sm font-medium">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {user?.isTwoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-emerald-500 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
              <div>
                <p className="font-medium">2FA Aktif</p>
                <p className="text-xs text-emerald-500/80">Akun Anda dilindungi dengan autentikasi 2 langkah.</p>
              </div>
            </div>
            <Button variant="danger" onClick={handleDisable} isLoading={isLoading}>
              Nonaktifkan 2FA
            </Button>
          </div>
        ) : !setupData ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-yellow-500 bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
              <ShieldAlert className="h-6 w-6" />
              <div>
                <p className="font-medium">2FA Tidak Aktif</p>
                <p className="text-xs text-yellow-500/80">Sangat disarankan untuk mengaktifkan 2FA untuk keamanan ekstra.</p>
              </div>
            </div>
            <Button onClick={handleStartSetup} isLoading={isLoading}>
              Aktifkan 2FA Sekarang
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-lg text-center space-y-4">
              <h3 className="text-slate-200 font-medium">1. Scan QR Code</h3>
              <p className="text-xs text-slate-400">Scan QR Code ini menggunakan aplikasi seperti Google Authenticator atau Authy.</p>
              
              <div className="bg-white p-4 rounded-xl inline-block">
                <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div className="pt-4 border-t border-slate-800 text-left">
                <p className="text-xs text-slate-400 mb-2">Atau masukkan kode rahasia ini secara manual:</p>
                <code className="bg-slate-900 p-2 rounded text-blue-400 font-mono text-sm block text-center tracking-widest">
                  {setupData.secret}
                </code>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <h3 className="text-slate-200 font-medium">2. Verifikasi Kode</h3>
              <p className="text-xs text-slate-400">Masukkan 6 digit kode dari aplikasi authenticator Anda untuk mengonfirmasi.</p>
              
              <div className="flex space-x-4">
                <Input
                  type="text"
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  maxLength={6}
                  className="text-center tracking-widest font-mono text-lg"
                  required
                />
                <Button type="submit" isLoading={isLoading} disabled={token.length !== 6}>
                  Verifikasi
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
