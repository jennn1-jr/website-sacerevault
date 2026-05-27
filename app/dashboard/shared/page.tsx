"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { FileIcon, Download, ShieldCheck, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { useRouter } from "next/navigation";

interface SharedDocumentItem {
  id: string;
  title: string;
  size: string | number;
  mimeType: string;
  owner: {
    name: string;
    email: string;
  };
}

export default function SharedVaultPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery<SharedDocumentItem[]>({
    queryKey: ["shared-documents"],
    queryFn: async () => {
      const res = await api.get("/documents/shared");
      return res.data.data;
    },
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [activeDoc, setActiveDoc] = useState<SharedDocumentItem | null>(null);
  const [actionError, setActionError] = useState("");
  
  // New state for Receive via Code modal
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [shareCode, setShareCode] = useState("");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleReceiveCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) return;
    // Extract token if they pasted the full URL
    let token = shareCode.trim();
    if (token.includes('/temporary-share/')) {
      token = token.split('/temporary-share/')[1].split('?')[0];
    }
    router.push(`/temporary-share/${encodeURIComponent(token)}`);
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !password) return;

    setActionError("");
    setDownloadingId(activeDoc.id);

    try {
      const res = await api.post(
        `/documents/${activeDoc.id}/download`,
        { vaultPassword: password },
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = res.headers["content-disposition"];
      let filename = activeDoc.title;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setActiveDoc(null);
      setPassword("");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: Blob };
      };
      if (axiosError.response?.data instanceof Blob) {
        const text = await axiosError.response.data.text();
        try {
          const json = JSON.parse(text);
          const errMsg = json.message || "Failed to process request";
          if (errMsg.toLowerCase().includes('invalid vault password') || errMsg.toLowerCase().includes('cryptographic')) {
            setActionError("Vault Password salah! Masukkan Vault Password yang sama persis dengan yang Anda gunakan saat MENDAFTAR akun.");
          } else {
            setActionError(errMsg);
          }
        } catch {
          setActionError("Failed to process request");
        }
      } else {
        setActionError("Failed to process request");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Shared With Me</h2>
          <p className="text-sm text-slate-400 mt-1">
            Files that have been securely shared with your RSA Public Key.
          </p>
        </div>
        <Button 
          variant="default" 
          onClick={() => setShowCodeModal(true)}
          className="shrink-0 bg-blue-600 hover:bg-blue-700"
        >
          <ShieldCheck className="h-4 w-4 mr-2" />
          Terima via Kode
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((doc: SharedDocumentItem) => (
          <div
            key={doc.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2">
              <span className="inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">
                Shared
              </span>
            </div>

            <div className="flex items-start justify-between mt-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <FileIcon className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3
                    className="text-sm font-medium text-slate-200 line-clamp-1"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatBytes(Number(doc.size))}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-950 rounded-lg text-xs text-slate-400">
              <p>
                <span className="text-slate-500">Owner:</span> {doc.owner.name}
              </p>
              <p className="mt-1">
                <span className="text-slate-500">Email:</span> {doc.owner.email}
              </p>
            </div>

            <div className="mt-4 flex items-center text-xs text-slate-500 space-x-1">
              <ShieldCheck className="h-3 w-3 text-blue-500" />
              <span>AES-256 + RSA-4096 Encrypted</span>
            </div>

            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setActiveDoc(doc);
                  setPassword("");
                  setActionError("");
                }}
              >
                <Download className="h-3 w-3 mr-2" />
                Decrypt & Download
              </Button>
            </div>
          </div>
        ))}

        {data?.length === 0 && (
          <div className="col-span-full py-16 px-6 relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
              <div className="inline-flex items-center justify-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner">
                <Users className="h-10 w-10 text-blue-400" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Belum ada file yang dibagikan
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-md mx-auto">
                  Ruang ini akan menampilkan semua file yang dibagikan orang lain kepada Anda secara aman menggunakan enkripsi E2E.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-6">
                <div 
                  onClick={() => setShowCodeModal(true)}
                  className="flex flex-col items-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-emerald-500/50 hover:bg-emerald-600/10 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-2">Terima via Kode</h4>
                  <p className="text-xs text-emerald-200/70 text-center mb-4">
                    Masukkan kode unik atau tautan (token) dari teman Anda untuk mengunduh file secara instan.
                  </p>
                  <div className="mt-auto text-xs font-medium text-emerald-400 group-hover:text-emerald-300 flex items-center">
                    Masukkan Kode 
                    <svg className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>

                <div 
                  onClick={() => router.push('/dashboard/share-nearby')}
                  className="flex flex-col items-center p-6 bg-blue-600/10 rounded-xl border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-600/20 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-2">Kirim ke Teman (Share Nearby)</h4>
                  <p className="text-xs text-blue-200/70 text-center mb-4">
                    Bagikan file Anda secara instan menggunakan QR Code.
                  </p>
                  <div className="mt-auto text-xs font-medium text-blue-400 group-hover:text-blue-300 flex items-center">
                    Coba Fitur Ini 
                    <svg className="ml-1 w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Terima File via Kode
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Masukkan kode share atau tempel (paste) tautan yang diberikan oleh teman Anda.
            </p>

            <form onSubmit={handleReceiveCode} className="space-y-4">
              <Input
                label="Kode Share (Token)"
                type="text"
                required
                placeholder="Contoh: 1234567890abcdef"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                autoComplete="off"
              />

              <div className="flex space-x-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowCodeModal(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                >
                  Buka File
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Decrypt & Download Shared File
            </h3>

            <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center">
              <FileIcon className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate">
                {activeDoc.title}
              </span>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
                {actionError}
              </div>
            )}

            <form onSubmit={handleDownload} className="space-y-4">
              <Input
                label="Vault Password Brankas"
                type="password"
                required
                placeholder="Masukkan vault password dari saat Anda daftar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <div className="mt-1 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400 font-medium">⚠️ Ini adalah Vault Password yang sama dengan yang Anda buat saat MENDAFTAR. Bukan password login Anda.</p>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setActiveDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={downloadingId === activeDoc.id}
                >
                  Download
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
