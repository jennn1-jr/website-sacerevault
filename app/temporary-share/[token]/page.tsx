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
}

export default function TemporarySharePage() {
  const params = useParams();
  const token = params.token ?? "";
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await api.get(`/temporary-share/${token}?info=1`);
        setMetadata(res.data.data);
      } catch (err) {
        setError("Tautan tidak valid atau sudah kadaluarsa.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleDownload = () => {
    window.location.href = `/api/temporary-share/${encodeURIComponent(token)}`;
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-10 text-slate-100">
      <div className="w-full rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold">Temporary Share</h1>
        <p className="mt-2 text-slate-400">
          Unduh file yang dibagikan dari tautan sementara ini.
        </p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat...
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

            <Button onClick={handleDownload}>Unduh File</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
