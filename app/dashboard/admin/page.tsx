"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { Users, FileText, Database, ShieldAlert, Loader2 } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalSizeBytes: number;
}

interface ActivityLog {
  id: string;
  createdAt: string;
  userId: string;
  user?: { name?: string } | null;
  action: string;
  status: "SUCCESS" | "FAILURE" | string;
}

interface AdminDashboardData {
  stats: AdminStats;
  recentActivity: ActivityLog[];
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminDashboardData>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalDocuments: 0,
    totalSizeBytes: 0,
  };
  const activityLogs = data?.recentActivity ?? [];
  const sizeMB = (stats.totalSizeBytes / 1024 / 1024).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          System Administration
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Monitor lockArchive storage and user activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">Total Users</p>
              <h3 className="text-2xl font-bold text-white">
                {stats.totalUsers}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <FileText className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">
                Active Documents
              </p>
              <h3 className="text-2xl font-bold text-white">
                {stats.totalDocuments}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Database className="h-6 w-6 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-400">
                Total Storage
              </p>
              <h3 className="text-2xl font-bold text-white">{sizeMB} MB</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center mb-6">
          <ShieldAlert className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-medium text-white">
            Security & Activity Logs
          </h3>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-950">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Action
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {activityLogs.length > 0 ? (
                activityLogs.map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {log.user?.name || log.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
