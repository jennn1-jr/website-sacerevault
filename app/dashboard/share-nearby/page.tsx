"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/src/lib/api";
import { QRCodeCanvas } from "qrcode.react";
import SimplePeer from "simple-peer";
import { v4 as uuidv4 } from "uuid";
import { FileIcon, Share2, Wifi, Loader2, UploadCloud, File as FileLucideIcon, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface DocumentItem {
  id: string;
  title: string;
  mimeType?: string;
  size: number | string;
}

interface SignalItem {
  id: string;
  from: string;
  payload: unknown;
}

export default function ShareNearbyPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sourceType, setSourceType] = useState<"local" | "vault">("local");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [shareMode, setShareMode] = useState<"qr" | "p2p">("qr");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [transferProgress, setTransferProgress] = useState<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [receivedFile, setReceivedFile] = useState<string | null>(null);
  const [receivedName, setReceivedName] = useState<string>("");

  const clientId = useMemo(() => uuidv4(), []);
  const peerRef = useRef<any>(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await api.get("/documents");
        setDocuments(res.data.data || []);
      } catch (error: unknown) {
        setErrors("Unable to load documents");
      }
    }
    loadDocuments();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      peerRef.current?.destroy();
    };
  }, []);

  const selectedDoc = useMemo(
    () => documents.find((doc) => doc.id === selectedId) ?? null,
    [documents, selectedId],
  );

  const shareTokenUrl = useMemo(() => {
    if (!shareUrl) return "";
    return shareUrl;
  }, [shareUrl]);

  const createQrShare = async () => {
    if (sourceType === "vault" && !selectedId) {
      setErrors("Pilih dokumen dari brankas");
      return;
    }
    if (sourceType === "local" && !localFile) {
      setErrors("Pilih file dari perangkat Anda");
      return;
    }
    if (!vaultPassword) {
      setErrors("Masukkan kata sandi brankas untuk enkripsi");
      return;
    }

    setErrors("");
    setStatus("Membuat tautan QR share...");
    try {
      let targetId = selectedId;

      if (sourceType === "local" && localFile) {
        setStatus("Mengunggah dan mengenkripsi file...");
        const formData = new FormData();
        formData.append("file", localFile);
        formData.append("vaultPassword", vaultPassword);
        const uploadRes = await api.post("/documents/upload", formData);
        targetId = uploadRes.data.data.id;
      }

      setStatus("Membuat tautan QR share sementara...");
      const res = await api.post(`/documents/${targetId}/temporary-share`, {
        vaultPassword,
        expiresInMinutes: 30,
        maxAccess: 5,
      });
      const url = res.data.data.shareUrl as string;
      setShareUrl(url);
      setStatus("QR share siap. Scan untuk mengunduh file sementara.");
    } catch (error: unknown) {
      setErrors("Gagal membuat share QR. Pastikan kata sandi benar.");
      setStatus("");
    }
  };

  const createP2PSession = async () => {
    if (sourceType === "vault" && !selectedId) {
      setErrors("Pilih dokumen dari brankas");
      return;
    }
    if (sourceType === "local" && !localFile) {
      setErrors("Pilih file dari perangkat Anda");
      return;
    }
    if (sourceType === "vault" && !vaultPassword) {
      setErrors("Masukkan kata sandi brankas");
      return;
    }
    setErrors("");
    setStatus("Membuat sesi WebRTC...");
    try {
      const res = await api.post("/webrtc/session", {
        createdBy: "share-nearby",
      });
      const newSessionId = res.data.data.sessionId as string;
      setSessionId(newSessionId);
      setStatus("Sesi WebRTC dibuat. Gunakan QR untuk bergabung.");
      setConnecting(true);
    } catch (error: unknown) {
      setErrors("Gagal membuat sesi WebRTC");
      setStatus("");
    }
  };

  const sendFileOverPeer = async () => {
    if (!peerRef.current) return;

    setStatus("Menunggu koneksi WebRTC...");
    try {
      let fileBuffer: ArrayBuffer;
      let title = "";
      let mimeType = "application/octet-stream";

      if (sourceType === "local" && localFile) {
        setStatus("Membaca file lokal...");
        fileBuffer = await localFile.arrayBuffer();
        title = localFile.name;
        mimeType = localFile.type || mimeType;
      } else if (sourceType === "vault" && selectedDoc) {
        setStatus("Mengunduh dan mendekripsi file dari server...");
        const res = await api.post(
          `/documents/${selectedDoc.id}/download`,
          { vaultPassword },
          { responseType: "arraybuffer" },
        );
        fileBuffer = res.data as ArrayBuffer;
        title = selectedDoc.title;
        mimeType = selectedDoc.mimeType || mimeType;
      } else {
        return;
      }

      setStatus("Mengirim file...");
      const chunkSize = 64 * 1024;
      const total = fileBuffer.byteLength;
      let offset = 0;
      const meta = JSON.stringify({
        type: "file-meta",
        name: title,
        mimeType: mimeType,
        size: total,
      });
      peerRef.current.send(meta);

      while (offset < total) {
        const chunk = fileBuffer.slice(
          offset,
          Math.min(offset + chunkSize, total),
        );
        peerRef.current.send(chunk);
        offset += chunk.byteLength;
        setTransferProgress(Math.round((offset / total) * 100));
        // Small delay to prevent overwhelming the WebRTC buffer for large files
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      peerRef.current.send(JSON.stringify({ type: "file-end" }));
      setStatus("File terkirim secara P2P! Tunggu penerima.");
    } catch (error: unknown) {
      setErrors("Gagal membaca atau mengirim file lewat WebRTC");
      setStatus("");
    }
  };

  const createPeer = () => {
    if (!sessionId) return;
    const peer = new SimplePeer({ initiator: true, trickle: false });
    peerRef.current = peer;

    peer.on("signal", async (signal: any) => {
      await api.post(`/webrtc/session/${sessionId}/signal`, {
        from: clientId,
        payload: signal,
      });
    });

    peer.on("connect", () => {
      setConnected(true);
      setStatus("Koneksi WebRTC terhubung. Mengirim file...");
      void sendFileOverPeer();
    });

    peer.on("error", (err: Error | string | unknown) => {
      setErrors(`WebRTC error: ${String(err)}`);
    });

    peer.on("close", () => {
      setStatus("Koneksi WebRTC ditutup");
      setConnected(false);
    });

    const interval = setInterval(async () => {
      try {
        const result = await api.get(
          `/webrtc/session?sessionId=${sessionId}&clientId=${clientId}`,
        );
        const pending = result.data.data.pending as SignalItem[];
        pending.forEach((item) => {
          peer.signal(item.payload as any);
        });
      } catch {
        // ignore polling errors
      }
    }, 2000);
    pollingRef.current = interval;
  };

  useEffect(() => {
    if (connecting && sessionId && !peerRef.current) {
      createPeer();
    }
  }, [connecting, sessionId]);

  const joinUrl = sessionId
    ? `${window.location.origin}/webrtc/${sessionId}`
    : "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Share Nearby</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Bagikan file dengan teman lewat QR code atau langsung menggunakan
              WebRTC peer-to-peer.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            <Wifi className="h-4 w-4 text-blue-400" />
            Real-time transfer support
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                sourceType === "local"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setSourceType("local")}
            >
              Pilih dari Perangkat
            </button>
            <button
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                sourceType === "vault"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setSourceType("vault")}
            >
              Pilih dari Brankas
            </button>
          </div>

          {sourceType === "vault" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Dokumen Brankas
              </label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Pilih dokumen</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                File Lokal
              </label>
              {!localFile ? (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 hover:bg-slate-800/50 transition-colors">
                  <input
                    type="file"
                    id="local-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLocalFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="local-file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <div className="p-3 bg-blue-500/10 rounded-full mb-3">
                      <UploadCloud className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-200">
                      Klik untuk memilih file dari perangkat Anda
                    </p>
                  </label>
                </div>
              ) : (
                <div className="p-4 border border-slate-800 rounded-xl bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="p-3 bg-blue-500/10 rounded-lg shrink-0">
                      <FileLucideIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {localFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(localFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalFile(null)}
                    className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {!(sourceType === "local" && shareMode === "p2p") && (
            <Input
              label="Password Brankas"
              type="password"
              required
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
              placeholder="Masukkan password vault Anda"
            />
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant={shareMode === "qr" ? "default" : "outline"}
              onClick={() => setShareMode("qr")}
            >
              QR code share
            </Button>
            <Button
              variant={shareMode === "p2p" ? "default" : "outline"}
              onClick={() => setShareMode("p2p")}
            >
              WebRTC peer-to-peer
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {shareMode === "qr" ? (
              <Button onClick={createQrShare}>Buat QR Tautan</Button>
            ) : (
              <Button onClick={createP2PSession}>Mulai WebRTC Share</Button>
            )}
          </div>

          {status && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
              {status}
            </div>
          )}

          {errors && (
            <div className="rounded-2xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {errors}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-950 p-3">
                <Share2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Hasil Share
                </h2>
                <p className="text-sm text-slate-400">
                  Tautan sementara atau kode QR untuk dikirim.
                </p>
              </div>
            </div>

            {shareUrl && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-950 p-4 text-sm text-slate-200">
                  <p className="font-medium text-slate-100">Tautan QR share</p>
                  <p className="break-all text-xs text-slate-400">{shareUrl}</p>
                </div>
                <div className="flex justify-center">
                  <QRCodeCanvas
                    value={shareUrl}
                    size={220}
                    bgColor="#0f172a"
                    fgColor="#f8fafc"
                  />
                </div>
              </div>
            )}

            {sessionId && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-950 p-4 text-sm text-slate-200">
                  <p className="font-medium text-slate-100">WebRTC join page</p>
                  <p className="break-all text-xs text-slate-400">{joinUrl}</p>
                </div>
                <div className="flex justify-center">
                  <QRCodeCanvas
                    value={joinUrl}
                    size={220}
                    bgColor="#0f172a"
                    fgColor="#f8fafc"
                  />
                </div>
                <div className="rounded-3xl bg-slate-950 p-4 text-sm text-slate-200">
                  <p>
                    Status koneksi:{" "}
                    {connected
                      ? "Terhubung"
                      : connecting
                        ? "Membuka sesi"
                        : "Belum terhubung"}
                  </p>
                  <p>Progress transfer: {transferProgress}%</p>
                </div>
              </div>
            )}

            {receivedFile && (
              <div className="rounded-3xl bg-slate-950 p-4 text-sm text-slate-200">
                <p className="font-medium text-slate-100">File diterima</p>
                <p>{receivedName}</p>
                <a
                  className="inline-flex items-center rounded-full bg-blue-500 px-4 py-2 text-sm text-white"
                  href={receivedFile}
                  download={receivedName}
                >
                  Unduh file
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
