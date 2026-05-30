"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Loader2 } from "lucide-react";

interface ShareMetadata {
  documentId: string;
  originalName: string;
  mimeType: string;
  expiresAt: string;
  accessCount: number;
  maxAccess: number;
  isActive: boolean;
  requiresPasscode: boolean;
}

export default function TemporarySharePage() {
  const params = useParams();
  const token = params.token ?? "";
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passcode, setPasscode] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await api.get(`/temporary-share/${token}?info=1`, { timeout: 60000 });
        setMetadata(res.data.data);
      } catch (err: any) {
        if (err.code === 'ECONNABORTED') {
          setError("Koneksi ke server terputus (Timeout). Pastikan HP dan Laptop di WiFi yang sama.");
        } else {
          setError("Tautan tidak valid atau koneksi bermasalah.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleDownload = async () => {
    if (metadata?.requiresPasscode && !passcode) {
      setActionError("Masukkan kode akses terlebih dahulu.");
      return;
    }

    setDownloading(true);
    setActionError("");

    try {
      const res = await api.post(
        `/temporary-share/${encodeURIComponent(token as string)}`,
        { passcode },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = res.headers["content-disposition"];
      let filename = metadata?.originalName || "download";
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

      // Update metadata to reflect new access count if possible, or just let user know
      setMetadata(prev => prev ? { ...prev, accessCount: prev.accessCount + 1 } : null);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: Blob };
      };

      if (axiosError.response?.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const json = JSON.parse(text);
          setActionError(json.message || "Gagal mengunduh file.");
        } catch {
          setActionError("Terjadi kesalahan saat mengunduh.");
        }
      } else {
        setActionError("Terjadi kesalahan koneksi.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10 text-slate-100">
      <div className="w-full rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Temporary Share</h1>
        <p className="mt-2 text-slate-400">
          Unduh file yang dibagikan dari tautan sementara ini.
        </p>

        {loading ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-slate-300">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Memuat...
            </div>
            <span className="text-xs text-slate-500 mt-2">Debug token: {token ? token : 'KOSONG'}</span>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-700/40 bg-red-950/20 p-5 text-sm text-red-300">
            {error}
          </div>
        ) : metadata ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Nama file</p>
              <p className="mt-1 text-lg font-medium text-white">
                {metadata.originalName}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Berlaku sampai {new Date(metadata.expiresAt).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Akses {metadata.accessCount}/{metadata.maxAccess}
              </p>
            </div>

            {metadata.requiresPasscode && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Kode Akses (Passcode)
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Masukkan kode akses..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {actionError && (
              <div className="rounded-lg bg-red-950/50 p-3 text-sm text-red-400 border border-red-900/50">
                {actionError}
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={downloading || (metadata.requiresPasscode && !passcode)}
              className="w-full"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengunduh...
                </>
              ) : (
                "Unduh File"
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
