"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { FileText, Lock, Loader2, ArrowLeft, Trash2, Copy, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ViewNotePage({ params }: { params: { id: string } }) {
  const [vaultPassword, setVaultPassword] = useState("");
  const [content, setContent] = useState("");
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  const router = useRouter();
  const queryClient = useQueryClient();

  // Resolve params if it's a promise (Next.js 15 app router dynamic params)
  const [id, setId] = useState<string | null>(null);
  
  useEffect(() => {
    // Next.js 15 treats params as a Promise, Next.js 14 as an object. We handle both.
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !vaultPassword) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post(
        `/documents/${id}/download`,
        { vaultPassword },
        { responseType: "blob" }
      );

      const text = await (res.data as Blob).text();
      setContent(text);
      setIsDecrypted(true);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: Blob | { message?: string } } };
      let errMsg = "Gagal membuka catatan";
      
      if (axiosError.response?.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.message || errMsg;
        } catch { /* ignore */ }
      } else if ((axiosError.response?.data as { message?: string })?.message) {
        errMsg = (axiosError.response!.data as { message: string }).message;
      }

      if (errMsg.toLowerCase().includes('invalid vault password') || errMsg.toLowerCase().includes('cryptographic')) {
        setError("Vault Password salah! Masukkan password yang benar.");
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm("Hapus catatan ini selamanya? Ini tidak dapat dikembalikan.");
    if (!confirmed) return;

    try {
      await api.delete(`/documents/${id}`);
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      router.push("/dashboard");
    } catch {
      alert("Gagal menghapus catatan");
    }
  };

  if (!id) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Dasbor
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <FileText className="mr-3 h-6 w-6 text-indigo-500" />
          Catatan Rahasia
        </h2>

        {!isDecrypted ? (
          <form onSubmit={handleDecrypt} className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-xl text-center">
              <Lock className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Catatan Terenkripsi</h3>
              <p className="text-sm text-slate-400 mb-6">
                Catatan ini dikunci dengan standar enkripsi AES-256. Masukkan Vault Password Anda untuk mendekripsinya.
              </p>
              
              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-left">
                  {error}
                </div>
              )}

              <div className="max-w-xs mx-auto space-y-4">
                <Input
                  type="password"
                  placeholder="Vault Password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-center text-white"
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={!vaultPassword || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Buka Kunci Catatan
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <textarea
                className="w-full h-80 p-6 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-sm focus:outline-none resize-y"
                value={content}
                readOnly
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 bg-slate-900"
                onClick={handleCopy}
              >
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Tersalin!" : "Salin Teks"}
              </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button
                variant="danger"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Catatan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
