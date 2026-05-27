"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Edit3, Lock, Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateNotePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !vaultPassword) return;

    setIsLoading(true);
    setError("");

    try {
      // Buat file virtual dari teks catatan
      const file = new File([content], `${title}.txt`, { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("vaultPassword", vaultPassword);
      formData.append("type", "NOTE");

      await api.post("/documents/upload", formData);
      
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      router.push("/dashboard");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string, error?: string } } };
      let errMsg = axiosError.response?.data?.message || "Gagal menyimpan catatan";
      if (errMsg.includes("password")) {
        setError("Vault Password salah! Masukkan Vault Password yang benar.");
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Edit3 className="mr-3 h-6 w-6 text-indigo-500" />
          Buat Catatan Rahasia
        </h2>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Judul Catatan</label>
            <Input
              type="text"
              placeholder="Misal: Password Bank, Jurnal Rahasia..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Isi Catatan</label>
            <textarea
              className="w-full h-64 p-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              placeholder="Ketik catatan rahasia Anda di sini..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-amber-500" />
              Vault Password (Wajib)
            </label>
            <Input
              type="password"
              placeholder="Masukkan password brankas Anda"
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
            <p className="text-xs text-amber-500 mt-1">
              Digunakan untuk mengenkripsi catatan ini. Jika lupa, catatan tidak dapat dibaca kembali.
            </p>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/dashboard")}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!title || !content || !vaultPassword || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enkripsi & Simpan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
