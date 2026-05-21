"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SimplePeer from "simple-peer";
import { api } from "@/src/lib/api";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/src/components/ui/Button";
import { Loader2, Wifi } from "lucide-react";

interface PendingSignal {
  id: string;
  from: string;
  payload: unknown;
}

export default function WebRtcJoinPage() {
  const params = useParams();
  const sessionId = params.sessionId ?? "";
  const [status, setStatus] = useState("Menunggu koneksi WebRTC...");
  const [connected, setConnected] = useState(false);
  const [errors, setErrors] = useState("");
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    mimeType: string;
    size: number;
  } | null>(null);
  const fileMetaRef = useRef<typeof fileMeta>(null);
  const [receivedBytes, setReceivedBytes] = useState<ArrayBuffer[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const [downloadName, setDownloadName] = useState("");

  const clientId = useMemo(() => uuidv4(), []);
  const peerRef = useRef<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const peer = new SimplePeer({ initiator: false, trickle: false });
    peerRef.current = peer;

    peer.on("signal", async (signal: any) => {
      await api.post(`/webrtc/session/${sessionId}/signal`, {
        from: clientId,
        payload: signal,
      });
    });

    peer.on("connect", () => {
      setConnected(true);
      setStatus("Koneksi WebRTC terhubung. Menerima file...");
    });

    peer.on("data", (data: ArrayBuffer | Uint8Array | string) => {
      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "file-meta") {
            const meta = {
              name: parsed.name,
              mimeType: parsed.mimeType,
              size: parsed.size,
            };
            setFileMeta(meta);
            fileMetaRef.current = meta;
          }
          if (parsed.type === "file-end") {
            const blob = new Blob(receivedBytes, {
              type: fileMetaRef.current?.mimeType || "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            downloadUrlRef.current = url;
            setDownloadName(fileMetaRef.current?.name ?? "download.bin");
            setStatus("File ready untuk diunduh");
          }
        } catch {
          // ignore non-json string data
        }
        return;
      }

      const chunk = data as ArrayBuffer;
      setReceivedBytes((previous) => [...previous, chunk]);
    });

    peer.on("error", (err: Error | string | unknown) => {
      setErrors(`WebRTC error: ${String(err)}`);
    });

    const interval = setInterval(async () => {
      try {
        const result = await api.get(
          `/webrtc/session/${sessionId}/signal?clientId=${clientId}`,
        );
        const pending = result.data.data.pending as PendingSignal[];
        pending.forEach((item) => {
          peer.signal(item.payload as any);
        });
      } catch {
        // ignore polling errors
      }
    }, 2000);
    pollingRef.current = interval;

    return () => {
      peer.destroy();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, [clientId, sessionId]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex items-center gap-3 text-slate-100">
          <Wifi className="h-5 w-5 text-blue-400" />
          <span className="font-semibold">WebRTC receiver</span>
        </div>
        <p className="mt-4 text-slate-400">
          Sambungkan ke sesi dan tunggu trasfer file. Jangan tutup halaman
          sampai download selesai.
        </p>

        <div className="mt-6 space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <p>Status: {status}</p>
          {errors && <p className="text-red-400">{errors}</p>}
          {fileMeta && (
            <p>
              File:{" "}
              <span className="font-medium text-slate-100">
                {fileMeta.name}
              </span>{" "}
              ({fileMeta.size} bytes)
            </p>
          )}
        </div>

        {downloadUrl && (
          <div className="mt-6">
            <a
              className="inline-flex items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-400"
              href={downloadUrl}
              download={downloadName}
            >
              Unduh file sekarang
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
