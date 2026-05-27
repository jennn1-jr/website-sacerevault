"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Activity, ArrowLeft, Loader2, Globe, Monitor, Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  action: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  status: string;
  createdAt: string;
}

export default function ActivityLogPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ["activity-logs", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await api.get(`/documents/${id}/activity`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseUserAgent = (ua: string) => {
    if (!ua || ua === 'Unknown') return 'Unknown Device';
    if (ua.includes('Mobile')) return 'Mobile Device';
    return 'Desktop Browser';
  };

  if (!id) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center">
              <Activity className="mr-3 h-6 w-6 text-emerald-500" />
              Riwayat Aktivitas (Audit Log)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Pantau siapa saja yang telah mengakses dokumen ini, kapan, dan dari mana.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Waktu</th>
                  <th className="px-6 py-4 font-medium">Aksi</th>
                  <th className="px-6 py-4 font-medium">Aktor / Pengguna</th>
                  <th className="px-6 py-4 font-medium">IP & Perangkat</th>
                  <th className="px-6 py-4 font-medium">Detail</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <Activity className="mx-auto h-8 w-8 mb-3 opacity-50" />
                      Belum ada aktivitas tercatat untuk dokumen ini.
                    </td>
                  </tr>
                ) : (
                  logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          log.action.includes('DOWNLOAD') ? 'bg-blue-500/10 text-blue-400' :
                          log.action.includes('SHARE') ? 'bg-purple-500/10 text-purple-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{log.userName}</div>
                        <div className="text-xs text-slate-500">{log.userEmail !== 'Unknown' ? log.userEmail : ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs">
                          <Globe className="w-3 h-3 mr-1 text-slate-500" />
                          {log.ipAddress}
                        </div>
                        <div className="flex items-center text-xs mt-1 text-slate-500">
                          <Monitor className="w-3 h-3 mr-1" />
                          {parseUserAgent(log.userAgent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate" title={log.details}>
                        {log.details || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
