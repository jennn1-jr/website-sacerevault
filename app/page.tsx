import Link from "next/link";
import { Shield, Lock, FileKey } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-3xl px-4">
        <div className="mx-auto h-20 w-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20 shadow-2xl shadow-blue-500/20">
          <Shield className="h-10 w-10 text-blue-500" />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
          lockArchive{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Enterprise
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
          Sistem pengarsipan dokumen kelas militer menggunakan Kriptografi
          Hibrida (AES-256 + RSA-4096) dan Tanda Tangan Digital untuk memastikan
          perlindungan data tanpa sepengetahuan (Zero-Knowledge).
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
          >
            Mulai Sekarang
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg shadow-lg border border-slate-700 transition-all hover:scale-105"
          >
            Masuk
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl px-6">
        <div className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl">
          <Lock className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Kriptografi Hibrida
          </h3>
          <p className="text-sm text-slate-400">
            File dienkripsi menggunakan AES-256-GCM. Kunci enkripsi dibungkus
            dengan aman menggunakan kunci publik RSA-4096.
          </p>
        </div>
        <div className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl">
          <Shield className="h-8 w-8 text-emerald-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Tanpa Pengetahuan (Zero-Knowledge)
          </h3>
          <p className="text-sm text-slate-400">
            Kunci privat RSA Anda dienkripsi secara simetris menggunakan
            password brankas. Kami tidak akan pernah bisa membaca file Anda.
          </p>
        </div>
        <div className="p-6 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl">
          <FileKey className="h-8 w-8 text-purple-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Tanda Tangan Digital
          </h3>
          <p className="text-sm text-slate-400">
            Hashing SHA-256 dan tanda tangan RSA-PSS menjamin integritas file
            dan mencegah manipulasi data.
          </p>
        </div>
      </div>
    </div>
  );
}
