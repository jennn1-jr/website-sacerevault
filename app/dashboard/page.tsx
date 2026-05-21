"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/src/lib/api";
import {
  FileIcon,
  Download,
  Share2,
  ShieldCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";

interface DocumentItem {
  id: string;
  title: string;
  size: string | number;
  mimeType?: string;
  createdAt?: string;
  fileHash?: string;
}

export default function MyVaultPage() {
  const { data, isLoading, refetch } = useQuery<DocumentItem[]>({
    queryKey: ["my-documents"],
    queryFn: async () => {
      const res = await api.get("/documents");
      return res.data.data;
    },
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [actionType, setActionType] = useState<"download" | "share" | null>(
    null,
  );
  const [targetEmail, setTargetEmail] = useState("");
  const [actionError, setActionError] = useState("");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !password) return;

    setActionError("");
    setDownloadingId(activeDoc.id);

    try {
      if (actionType === "download") {
        const res = await api.post(
          `/documents/${activeDoc.id}/download`,
          { vaultPassword: password },
          { responseType: "blob" },
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        // Try to get filename from content-disposition
        const contentDisposition = res.headers["content-disposition"];
        let filename = activeDoc.title;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (actionType === "share") {
        if (!targetEmail) {
          setActionError("Target email is required");
          setDownloadingId(null);
          return;
        }
        await api.post(`/documents/${activeDoc.id}/share`, {
          vaultPassword: password,
          targetEmail,
        });
        alert("File shared successfully!");
      }

      // Close modal
      setActiveDoc(null);
      setPassword("");
      setTargetEmail("");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      if (axiosError.response?.data?.message) {
        setActionError(axiosError.response.data.message);
      } else {
        setActionError("Failed to process request");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDocument = async (doc: DocumentItem) => {
    const confirmed = window.confirm(
      `Hapus dokumen '${doc.title}' dari brankas Anda? Ini tidak dapat dikembalikan.`,
    );
    if (!confirmed) return;

    setDownloadingId(doc.id);
    try {
      await api.delete(`/documents/${doc.id}`);
      refetch();
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      alert(axiosError.response?.data?.message || "Gagal menghapus file");
    } finally {
      setDownloadingId(null);
    }
  };

  const openModal = (doc: DocumentItem, type: "download" | "share") => {
    setActiveDoc(doc);
    setActionType(type);
    setPassword("");
    setTargetEmail("");
    setActionError("");
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">My Vault</h1>
          <p className="text-sm text-slate-400">
            Kelola file terenkripsi Anda. Download, share, atau hapus file dari
            brankas.
          </p>
        </div>
        <Link href="/dashboard/share-nearby">
          <Button variant="outline">Share Nearby</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((doc: DocumentItem) => (
          <div
            key={doc.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileIcon className="h-6 w-6 text-blue-500" />
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

            <div className="mt-4 flex items-center text-xs text-slate-500 space-x-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>AES-256 + RSA-4096 Encrypted</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => openModal(doc, "download")}
              >
                <Download className="h-3 w-3 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => openModal(doc, "share")}
              >
                <Share2 className="h-3 w-3 mr-2" />
                Share
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleDeleteDocument(doc)}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}

        {data?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <FileIcon className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-300">
              No files found
            </h3>
            <p className="text-slate-500 mt-1">
              Upload your first secure document to get started.
            </p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {actionType === "download"
                ? "Decrypt & Download"
                : "Share Document"}
            </h3>

            <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center">
              <FileIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate">
                {activeDoc.title}
              </span>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              {actionType === "share" && (
                <Input
                  label="Target User Email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
              )}

              <Input
                label="Vault Password"
                type="password"
                required
                placeholder="To decrypt your private key..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

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
                  {actionType === "download" ? "Download" : "Share"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
