"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { QRCodeCanvas } from "qrcode.react";
import { Share2, Wifi, UploadCloud, File as FileLucideIcon, X } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface DocumentItem {
  id: string;
  title: string;
  mimeType?: string;
  size: number | string;
}

export default function ShareNearbyPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sourceType, setSourceType] = useState<"local" | "vault">("local");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<string>("");
  const [passcode, setPasscode] = useState("");
  const [targetEmail, setTargetEmail] = useState("");

  const [friendEmail, setFriendEmail] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string; email: string } | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState("");

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
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (friendEmail.trim().length > 2 && !selectedFriend) {
        try {
          const res = await api.get(`/users/search?email=${encodeURIComponent(friendEmail)}`);
          setSearchResults(res.data.data);
        } catch (error) {
          console.error("Search failed", error);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [friendEmail, selectedFriend]);

  const sendCodeViaNotification = async () => {
    if (!friendEmail.trim() && !selectedFriend) return;
    const tokenOrUrl = shareUrl;
    if (!tokenOrUrl) return;

    setSendingNotification(true);
    setNotificationSuccess("");
    try {
      await api.post("/notifications", {
        targetUserId: selectedFriend?.id,
        email: !selectedFriend ? friendEmail.trim() : undefined,
        title: "File Baru Dibagikan",
        message: "Teman Anda membagikan file melalui Share Nearby. Salin tautan ini untuk mengunduh file.",
        type: "SHARE_CODE",
        data: tokenOrUrl,
      });
      setNotificationSuccess("Berhasil dikirim ke notifikasi teman.");
      window.dispatchEvent(new Event('refetch-notifications'));
      setTimeout(() => setNotificationSuccess(""), 5000);
      setFriendEmail("");
      setSelectedFriend(null);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      setErrors(axiosError.response?.data?.message || "Gagal mengirim notifikasi.");
      setTimeout(() => setErrors(""), 5000);
    } finally {
      setSendingNotification(false);
    }
  };

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
        passcode: passcode || undefined,
        targetEmail: targetEmail || undefined,
      });
      const url = res.data.data.shareUrl as string;
      setShareUrl(url);
      setStatus(
        targetEmail
          ? "QR share siap dan email telah dikirim. Scan untuk mengunduh file sementara."
          : "QR share siap. Scan untuk mengunduh file sementara."
      );
    } catch (error: unknown) {
      setErrors("Gagal membuat share QR. Pastikan kata sandi benar.");
      setStatus("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Share Nearby</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Bagikan file dengan teman lewat QR code atau tautan langsung.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            <Wifi className="h-4 w-4 text-blue-400" />
            Temporary Share
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

          <Input
            label="Password Brankas"
            type="password"
            required
            value={vaultPassword}
            onChange={(e) => setVaultPassword(e.target.value)}
            placeholder="Masukkan password vault Anda"
          />

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <Input
              label="Kode Akses (Opsional)"
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Masukkan PIN untuk membuka dokumen (mis. 1234)"
            />

            <Input
              label="Kirim Tautan ke Email (Opsional)"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="email@contoh.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              Penerima akan mendapatkan tautan dokumen (dan kode akses jika diisi) via email.
            </p>
          </div>

          <Button className="w-full" onClick={createQrShare}>Buat Tautan Bagikan</Button>

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

            {shareUrl ? (
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
            ) : (
              <div className="py-8 text-center text-slate-500">
                Belum ada tautan yang dibuat
              </div>
            )}

            {shareUrl && (
              <div className="mt-8 border-t border-slate-800 pt-6 space-y-4">
                <h3 className="text-sm font-medium text-white">Kirim Tautan ke Teman</h3>
                <p className="text-xs text-slate-400">
                  Kirimkan tautan ini langsung ke notifikasi teman Anda.
                </p>
                <div className="relative">
                  <Input
                    label="Email Teman"
                    type="email"
                    value={friendEmail}
                    onChange={(e) => {
                      setFriendEmail(e.target.value);
                      if (selectedFriend) setSelectedFriend(null);
                    }}
                    placeholder="Ketik email teman..."
                  />
                  {searchResults.length > 0 && !selectedFriend && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0"
                          onClick={() => {
                            setSelectedFriend(user);
                            setFriendEmail(user.email);
                            setSearchResults([]);
                          }}
                        >
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedFriend && (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-400">{selectedFriend.name}</p>
                      <p className="text-xs text-blue-400/70">{selectedFriend.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFriend(null);
                        setFriendEmail("");
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {notificationSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg">
                    {notificationSuccess}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!friendEmail.trim()}
                  isLoading={sendingNotification}
                  onClick={sendCodeViaNotification}
                >
                  Kirim via Notifikasi
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
