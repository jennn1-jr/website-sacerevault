"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { UploadCloud, File, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [encryptionMode, setEncryptionMode] = useState("AES-GCM");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !vaultPassword) return;

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("vaultPassword", vaultPassword);
    formData.append("encryptionMode", encryptionMode);
    if (shareCode) {
      formData.append("shareCode", shareCode);
    }

    try {
      await api.post("/documents/upload", formData);
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
      router.push("/dashboard");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const errMsg = axiosError.response?.data?.message || "Failed to upload file";
      if (errMsg.toLowerCase().includes('invalid vault password') || errMsg.toLowerCase().includes('cryptographic')) {
        setError("Vault Password salah! Masukkan Vault Password yang sama persis dengan yang Anda gunakan saat MENDAFTAR (Register). Bukan password login Anda.");
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <UploadCloud className="mr-3 h-6 w-6 text-blue-500" />
          Secure Upload
        </h2>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          {!file ? (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500/50 hover:bg-slate-800/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                  <UploadCloud className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-lg font-medium text-slate-200">
                  Click to select a file
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Maximum file size: 50MB
                </p>
              </label>
            </div>
          ) : (
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-4 overflow-hidden">
                <div className="p-3 bg-blue-500/10 rounded-lg shrink-0">
                  <File className="h-6 w-6 text-blue-500" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div>
              <Input
                label="Vault Password Brankas (Wajib)"
                type="password"
                required
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                placeholder="Masukkan vault password dari saat Anda daftar"
                disabled={!file}
                autoComplete="new-password"
              />
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400 font-medium">⚠️ Penting: Masukkan Vault Password yang sama persis dengan yang Anda gunakan saat MENDAFTAR akun. Ini berbeda dengan password login Anda.</p>
              </div>
            </div>
            
            <div>
              <Input
                label="Kode Share (Opsional)"
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                placeholder="Contoh: RAHASIA123"
                disabled={!file}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-2 mb-4">
                Buat kode share khusus agar teman Anda bisa langsung mengakses file ini di menu "Dibagikan dengan Saya" tanpa perlu login.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Algoritma Enkripsi</label>
              <select
                value={encryptionMode}
                onChange={(e) => setEncryptionMode(e.target.value)}
                disabled={!file}
                className="w-full h-11 px-4 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="AES-GCM">AES-256-GCM (Direkomendasikan)</option>
                <option value="AES-CBC">AES-256-CBC</option>
                <option value="AES-CTR">AES-256-CTR</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/dashboard")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!file || !vaultPassword || isLoading}
              isLoading={isLoading}
            >
              Encrypt & Upload
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
