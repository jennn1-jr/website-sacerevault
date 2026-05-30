'use client';

import { useState } from 'react';
import { Activity, Play, File, Zap, AlertCircle, Shield } from 'lucide-react';

export default function BenchmarkPage() {
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    cbc: { encrypt: number; decrypt: number };
    ctr: { encrypt: number; decrypt: number };
    fileSize: number;
  } | null>(null);

  const runBenchmark = async () => {
    if (!testFile) return;
    setIsProcessing(true);
    setResults(null);

    // Provide a small delay so UI updates to show "Processing..."
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const buffer = await testFile.arrayBuffer();
      
      // Generate a common 256-bit raw key
      const rawKey = window.crypto.getRandomValues(new Uint8Array(32)); 
      
      const keyCBC = await window.crypto.subtle.importKey(
        'raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
      );
      
      const keyCTR = await window.crypto.subtle.importKey(
        'raw', rawKey, { name: 'AES-CTR' }, false, ['encrypt', 'decrypt']
      );

      // --- AES-CBC Benchmark ---
      const ivCBC = window.crypto.getRandomValues(new Uint8Array(16));
      
      const startCbcEnc = performance.now();
      const encryptedCBC = await window.crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivCBC }, keyCBC, buffer
      );
      const endCbcEnc = performance.now();
      
      const startCbcDec = performance.now();
      await window.crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: ivCBC }, keyCBC, encryptedCBC
      );
      const endCbcDec = performance.now();

      // --- AES-CTR Benchmark ---
      const counterCTR = window.crypto.getRandomValues(new Uint8Array(16));
      
      const startCtrEnc = performance.now();
      const encryptedCTR = await window.crypto.subtle.encrypt(
        { name: 'AES-CTR', counter: counterCTR, length: 64 }, keyCTR, buffer
      );
      const endCtrEnc = performance.now();
      
      const startCtrDec = performance.now();
      await window.crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: counterCTR, length: 64 }, keyCTR, encryptedCTR
      );
      const endCtrDec = performance.now();

      setResults({
        cbc: { encrypt: endCbcEnc - startCbcEnc, decrypt: endCbcDec - startCbcDec },
        ctr: { encrypt: endCtrEnc - startCtrEnc, decrypt: endCtrDec - startCtrDec },
        fileSize: testFile.size
      });

    } catch (e: any) {
      alert('Gagal menjalankan benchmark: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMaxTime = () => {
    if (!results) return 1;
    return Math.max(
      results.cbc.encrypt, results.cbc.decrypt,
      results.ctr.encrypt, results.ctr.decrypt
    );
  };

  const BarChart = ({ value, color }: { value: number, color: string }) => {
    const percentage = Math.max((value / getMaxTime()) * 100, 1);
    return (
      <div className="flex items-center space-x-3 w-full">
        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden relative">
          <div 
            className={`absolute top-0 left-0 h-full ${color} transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-mono text-slate-300 w-20 text-right">{value.toFixed(2)} ms</span>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <Activity className="mr-2 h-6 w-6 text-blue-500" />
          Security Benchmark
        </h2>
        <p className="text-slate-400 max-w-3xl">
          Uji komparasi kecepatan enkripsi AES-CBC melawan AES-CTR secara real-time di sisi klien.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-indigo-400" />
              Parameter Pengujian
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Pilih File Dummy / Uji Coba</label>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    onChange={(e) => {
                      setTestFile(e.target.files?.[0] || null);
                      setResults(null);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <File className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-center text-slate-300">
                    {testFile ? testFile.name : 'Pilih file untuk diuji'}
                  </span>
                  {testFile && (
                    <span className="text-xs font-bold text-blue-400 mt-1">{formatSize(testFile.size)}</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3 flex items-start">
                <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  Semua proses enkripsi dilakukan 100% di perangkat Anda (Client-Side). File tidak akan dikirim ke server.
                </p>
              </div>

              <button
                onClick={runBenchmark}
                disabled={!testFile || isProcessing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex justify-center items-center"
              >
                {isProcessing ? (
                  <>
                    <Zap className="mr-2 h-5 w-5 animate-pulse text-yellow-400" />
                    Menjalankan Pengujian...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Mulai Benchmark
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[400px]">
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <Activity className="mr-2 h-5 w-5 text-green-400" />
              Hasil Komparasi Kinerja
            </h3>

            {!results ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
                <Activity className="h-12 w-12 text-slate-600 mb-4 opacity-50" />
                <p className="text-slate-500 text-sm">Belum ada data pengujian. Silakan jalankan benchmark.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Tabel Perbandingan */}
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-300 uppercase bg-slate-800 border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 font-medium">Algoritma</th>
                        <th className="px-6 py-4 font-medium">Waktu Enkripsi</th>
                        <th className="px-6 py-4 font-medium">Waktu Dekripsi</th>
                        <th className="px-6 py-4 font-medium text-center">Kecepatan (Throughput)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      <tr className="hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4 font-semibold text-white">AES-256-CBC</td>
                        <td className="px-6 py-4 text-orange-400 font-mono">{results.cbc.encrypt.toFixed(2)} ms</td>
                        <td className="px-6 py-4 text-teal-400 font-mono">{results.cbc.decrypt.toFixed(2)} ms</td>
                        <td className="px-6 py-4 text-center text-slate-300 font-mono">
                          {((results.fileSize / 1024 / 1024) / (results.cbc.encrypt / 1000)).toFixed(2)} MB/s
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4 font-semibold text-white">AES-256-CTR</td>
                        <td className="px-6 py-4 text-orange-400 font-mono">{results.ctr.encrypt.toFixed(2)} ms</td>
                        <td className="px-6 py-4 text-teal-400 font-mono">{results.ctr.decrypt.toFixed(2)} ms</td>
                        <td className="px-6 py-4 text-center text-slate-300 font-mono">
                          {((results.fileSize / 1024 / 1024) / (results.ctr.encrypt / 1000)).toFixed(2)} MB/s
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grafik Bar */}
                <div className="space-y-6 pt-4">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Grafik Visualisasi (Lebih Pendek Lebih Baik)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Kolom Enkripsi */}
                    <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-950">
                      <h5 className="text-sm font-medium text-orange-400 flex items-center">
                        Proses Enkripsi (Encryption)
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">AES-CBC</p>
                          <BarChart value={results.cbc.encrypt} color="bg-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">AES-CTR 
                            {results.ctr.encrypt < results.cbc.encrypt && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Lebih Cepat</span>}
                          </p>
                          <BarChart value={results.ctr.encrypt} color="bg-orange-400" />
                        </div>
                      </div>
                    </div>

                    {/* Kolom Dekripsi */}
                    <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-950">
                      <h5 className="text-sm font-medium text-teal-400 flex items-center">
                        Proses Dekripsi (Decryption)
                      </h5>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">AES-CBC</p>
                          <BarChart value={results.cbc.decrypt} color="bg-teal-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">AES-CTR
                             {results.ctr.decrypt < results.cbc.decrypt && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Lebih Cepat</span>}
                          </p>
                          <BarChart value={results.ctr.decrypt} color="bg-teal-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
