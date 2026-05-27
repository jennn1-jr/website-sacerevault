"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/src/lib/api";
import {
  FileIcon,
  FileText,
  Download,
  Share2,
  ShieldCheck,
  Loader2,
  Trash2,
  Activity,
  FolderIcon,
  FolderPlus,
  ArrowLeft,
  Move
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
  type?: "FILE" | "NOTE";
  folderId?: string | null;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export default function MyVaultPage() {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const { data: documents, isLoading: docsLoading } = useQuery<DocumentItem[]>({
    queryKey: ["my-documents", currentFolderId],
    queryFn: async () => {
      const res = await api.get(`/documents?folderId=${currentFolderId || 'null'}`);
      return res.data.data;
    },
  });

  const { data: folders, isLoading: foldersLoading } = useQuery<FolderItem[]>({
    queryKey: ["my-folders", currentFolderId],
    queryFn: async () => {
      const res = await api.get(`/folders?parentId=${currentFolderId || 'null'}`);
      return res.data.data;
    },
  });

  const { data: allFolders } = useQuery<FolderItem[]>({
    queryKey: ["all-folders"],
    queryFn: async () => {
      const res = await api.get(`/folders`);
      return res.data.data;
    },
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [actionType, setActionType] = useState<"download" | "share" | "move" | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [actionError, setActionError] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string>("null");

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc) return;

    setActionError("");
    setDownloadingId(activeDoc.id);

    try {
      if (actionType === "download") {
        if (!password) { setActionError("Password required"); return; }
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
      } else if (actionType === "share") {
        if (!password) { setActionError("Password required"); return; }
        if (!targetEmail) { setActionError("Target email is required"); return; }
        await api.post(`/documents/${activeDoc.id}/share`, {
          vaultPassword: password,
          targetEmail,
        });
        alert("File shared successfully!");
      } else if (actionType === "move") {
        await api.put(`/documents/${activeDoc.id}/move`, {
          folderId: targetFolderId === "null" ? null : targetFolderId
        });
        queryClient.invalidateQueries({ queryKey: ["my-documents"] });
        alert("Dokumen berhasil dipindahkan!");
      }

      // Close modal
      setActiveDoc(null);
      setPassword("");
      setTargetEmail("");
      setActionType(null);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } | Blob };
      };
      let errMsg = "Failed to process request";
      if (axiosError.response?.data instanceof Blob) {
        try {
          const text = await (axiosError.response.data as Blob).text();
          const json = JSON.parse(text);
          errMsg = json.message || errMsg;
        } catch { /* ignore */ }
      } else if ((axiosError.response?.data as { message?: string })?.message) {
        errMsg = (axiosError.response!.data as { message: string }).message;
      }
      if (errMsg.toLowerCase().includes('invalid vault password') || errMsg.toLowerCase().includes('cryptographic')) {
        setActionError("Vault Password salah! Masukkan Vault Password yang benar.");
      } else {
        setActionError(errMsg);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.post("/folders", {
        name: newFolderName,
        parentId: currentFolderId
      });
      setNewFolderName("");
      setIsCreateFolderModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-folders"] });
      queryClient.invalidateQueries({ queryKey: ["all-folders"] });
    } catch (error) {
      alert("Gagal membuat folder");
    }
  };

  const handleDeleteDocument = async (doc: DocumentItem) => {
    const confirmed = window.confirm(`Hapus dokumen '${doc.title}' dari brankas Anda?`);
    if (!confirmed) return;
    setDownloadingId(doc.id);
    try {
      await api.delete(`/documents/${doc.id}`);
      queryClient.invalidateQueries({ queryKey: ["my-documents"] });
    } catch (error: unknown) {
      alert("Gagal menghapus file");
    } finally {
      setDownloadingId(null);
    }
  };

  const openModal = (doc: DocumentItem, type: "download" | "share" | "move") => {
    setActiveDoc(doc);
    setActionType(type);
    setPassword("");
    setTargetEmail("");
    setActionError("");
    setTargetFolderId(currentFolderId || "null");
  };

  if (docsLoading || foldersLoading) {
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
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center">
            {currentFolderId && (
              <Button variant="ghost" size="sm" className="mr-3" onClick={() => setCurrentFolderId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {currentFolderId ? "Isi Folder" : "My Vault"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {currentFolderId ? "Kelola file di dalam folder ini." : "Kelola file dan folder terenkripsi Anda."}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Folder Baru
          </Button>
          <Link href="/dashboard/share-nearby">
            <Button variant="outline">Share Nearby</Button>
          </Link>
        </div>
      </div>

      {/* FOLDERS GRID */}
      {folders && folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Folders</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folders.map(folder => (
              <div 
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:bg-slate-800 hover:border-blue-500/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
              >
                <FolderIcon className="h-10 w-10 text-blue-500/80 group-hover:text-blue-400 mb-3" />
                <span className="text-sm font-medium text-slate-200 line-clamp-1 break-all w-full">{folder.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS GRID */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Files & Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents?.map((doc: DocumentItem) => (
            <div
              key={doc.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${doc.type === 'NOTE' ? 'bg-indigo-500/10' : 'bg-blue-500/10'}`}>
                    {doc.type === 'NOTE' ? (
                      <FileText className="h-6 w-6 text-indigo-500" />
                    ) : (
                      <FileIcon className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h3
                      className="text-sm font-medium text-slate-200 line-clamp-1 break-all"
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
                {doc.type === 'NOTE' ? (
                  <Link href={`/dashboard/notes/${doc.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <FileText className="h-3 w-3 mr-2" /> Buka
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => openModal(doc, "download")}>
                    <Download className="h-3 w-3 mr-2" /> Unduh
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => openModal(doc, "share")}>
                  <Share2 className="h-3 w-3 mr-2" /> Share
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => openModal(doc, "move")}>
                  <Move className="h-3 w-3 mr-2" /> Pindah
                </Button>
                
                <div className="col-span-3 grid grid-cols-2 gap-3 mt-1">
                  <Link href={`/dashboard/documents/${doc.id}/activity`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
                      <Activity className="h-3 w-3 mr-2" /> Log
                    </Button>
                  </Link>
                  <Button variant="danger" size="sm" className="w-full text-xs" onClick={() => handleDeleteDocument(doc)}>
                    <Trash2 className="h-3 w-3 mr-2" /> Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {documents?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <FileIcon className="mx-auto h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300">Kosong</h3>
              <p className="text-slate-500 mt-1">Tidak ada file di lokasi ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Buat Folder Baru</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <Input
                label="Nama Folder"
                type="text"
                required
                placeholder="Misal: Dokumen Pajak"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="flex space-x-3 mt-6">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsCreateFolderModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Buat</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION MODAL */}
      {activeDoc && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {actionType === "download" ? "Decrypt & Download" : 
               actionType === "share" ? "Share Document" : 
               "Pindahkan Dokumen"}
            </h3>

            <div className="mb-4 p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center">
              <FileIcon className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate">{activeDoc.title}</span>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-500">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              {actionType === "move" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Pilih Folder Tujuan</label>
                  <select 
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                  >
                    <option value="null">/ (Root / Folder Utama)</option>
                    {allFolders?.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

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

              {actionType !== "move" && (
                <>
                  <Input
                    label="Vault Password Brankas"
                    type="password"
                    required
                    placeholder="Masukkan vault password Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="mt-1 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-400 font-medium">⚠️ Password saat mendaftar, bukan password login.</p>
                  </div>
                </>
              )}

              <div className="flex space-x-3 mt-6">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => { setActiveDoc(null); setActionType(null); }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" isLoading={downloadingId === activeDoc.id}>
                  {actionType === "download" ? "Download" : 
                   actionType === "share" ? "Share" : "Pindah"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
