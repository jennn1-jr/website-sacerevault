'use client';

import { useState } from 'react';
import { UploadCloud, Download, Image as ImageIcon, FileKey, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function StealthImagePage() {
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  
  // Encode State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [psnr, setPsnr] = useState<number | null>(null);
  const [stegoImageUrl, setStegoImageUrl] = useState<string | null>(null);
  
  // Decode State
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [extractedFileUrl, setExtractedFileUrl] = useState<string | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  const encodeLSB = async () => {
    if (!coverImage || !secretFile) return;
    setIsProcessing(true);
    
    try {
      const secretBuffer = await secretFile.arrayBuffer();
      const secretBytes = new Uint8Array(secretBuffer);
      const filenameBytes = new TextEncoder().encode(secretFile.name);
      
      const payloadSize = 8 + filenameBytes.length + secretBytes.length;
      const payload = new Uint8Array(payloadSize);
      const view = new DataView(payload.buffer);
      
      view.setUint32(0, filenameBytes.length, false); 
      payload.set(filenameBytes, 4);
      view.setUint32(4 + filenameBytes.length, secretBytes.length, false);
      payload.set(secretBytes, 8 + filenameBytes.length);
      
      const totalBitsNeeded = payloadSize * 8;
      
      const img = new window.Image();
      const imgUrl = URL.createObjectURL(coverImage);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context not available');
      
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const originalData = new Uint8ClampedArray(imgData.data);
      const data = imgData.data;
      
      const capacityBits = (canvas.width * canvas.height * 3);
      if (totalBitsNeeded > capacityBits) {
        throw new Error(`Ukuran file rahasia terlalu besar untuk gambar ini. Kapasitas tersisa: ${Math.floor(capacityBits/8)} bytes.`);
      }
      
      let bitIndex = 0;
      let payloadByteIndex = 0;
      
      for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue; // Skip alpha
        
        if (payloadByteIndex < payloadSize) {
          const bit = (payload[payloadByteIndex] >> (7 - (bitIndex % 8))) & 1;
          data[i] = (data[i] & 0xFE) | bit;
          
          bitIndex++;
          if (bitIndex % 8 === 0) {
            payloadByteIndex++;
          }
        } else {
          break; 
        }
      }
      
      let mse = 0;
      for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 !== 0) { 
          const diff = originalData[i] - data[i];
          mse += diff * diff;
        }
      }
      mse = mse / (canvas.width * canvas.height * 3);
      const calculatedPsnr = mse === 0 ? 100 : 10 * Math.log10((255 * 255) / mse);
      
      ctx.putImageData(imgData, 0, 0);
      setStegoImageUrl(canvas.toDataURL('image/png'));
      setPsnr(calculatedPsnr);
      
    } catch (e: any) {
      alert(e.message || 'Gagal menyisipkan data.');
    } finally {
      setIsProcessing(false);
    }
  };

  const decodeLSB = async () => {
    if (!stegoImage) return;
    setIsProcessing(true);
    
    try {
      const img = new window.Image();
      const imgUrl = URL.createObjectURL(stegoImage);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context not available');
      
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      let dataIndex = 0;
      
      const readNextByte = () => {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
          while ((dataIndex + 1) % 4 === 0) {
            dataIndex++; 
          }
          if (dataIndex >= data.length) throw new Error('Data gambar tidak valid atau korup.');
          const bit = data[dataIndex] & 1;
          byte = (byte << 1) | bit;
          dataIndex++;
        }
        return byte;
      };

      const readNextUint32 = () => {
        let val = 0;
        for (let i = 0; i < 4; i++) {
          val = (val << 8) | readNextByte();
        }
        return val >>> 0; 
      };

      const filenameLength = readNextUint32();
      if (filenameLength === 0 || filenameLength > 1000) {
         throw new Error('Gambar ini tidak mengandung pesan tersembunyi (Stego-Image) yang valid.');
      }

      const filenameBytes = new Uint8Array(filenameLength);
      for (let i = 0; i < filenameLength; i++) {
        filenameBytes[i] = readNextByte();
      }
      const filename = new TextDecoder().decode(filenameBytes);

      const dataLength = readNextUint32();
      if (dataLength === 0 || dataLength > 50 * 1024 * 1024) { 
         throw new Error('Gambar ini tidak mengandung pesan tersembunyi yang valid.');
      }

      const fileData = new Uint8Array(dataLength);
      for (let i = 0; i < dataLength; i++) {
        fileData[i] = readNextByte();
      }

      const blob = new Blob([fileData]);
      setExtractedFileUrl(URL.createObjectURL(blob));
      setExtractedFileName(filename);

    } catch (e: any) {
      alert(e.message || 'Gagal mengekstrak data dari gambar.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <ImageIcon className="mr-2 h-6 w-6 text-blue-500" />
          Stealth Image
        </h2>
        <p className="text-slate-400">
          Sembunyikan file rahasia ke dalam sebuah gambar tanpa mengubah tampilan fisiknya menggunakan teknik LSB (Least Significant Bit) Client-Side.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-8">
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('encode')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'encode' ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            Sembunyikan File (Encode)
          </button>
          <button
            onClick={() => setActiveTab('decode')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'decode' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            Ekstrak File (Decode)
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'encode' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">1. Pilih Gambar Sampul (PNG/JPG)</label>
                  <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg" 
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-300">{coverImage ? coverImage.name : 'Klik atau seret gambar ke sini'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">2. Pilih File Rahasia</label>
                  <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer relative">
                    <input 
                      type="file" 
                      onChange={(e) => setSecretFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileKey className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-300">{secretFile ? secretFile.name : 'Pilih file yang ingin disembunyikan'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={encodeLSB}
                  disabled={!coverImage || !secretFile || isProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex justify-center items-center"
                >
                  {isProcessing ? 'Memproses...' : 'Proses & Sembunyikan File'}
                </button>
              </div>

              {psnr !== null && stegoImageUrl && (
                <div className="mt-6 p-6 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex items-start mb-6">
                    <div className="p-3 bg-green-500/10 rounded-lg mr-4">
                      <ShieldCheck className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Berhasil Disembunyikan!</h3>
                      <p className="text-sm text-slate-400 mt-1">File Anda telah aman disisipkan ke dalam gambar.</p>
                      
                      <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-slate-900 border border-slate-700">
                        <span className="text-xs font-medium text-slate-400 mr-2">Tingkat Kualitas (PSNR):</span>
                        <span className="text-sm font-bold text-green-400">{psnr.toFixed(2)} dB</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        *PSNR di atas 40 dB berarti perubahan tidak dapat dilihat oleh mata manusia.
                      </p>
                    </div>
                  </div>

                  <a 
                    href={stegoImageUrl} 
                    download={`stealth_${coverImage?.name.split('.')[0] || 'image'}.png`}
                    className="flex items-center justify-center w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Unduh Gambar Hasil (Stego-Image PNG)
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-lg p-4 mb-6 flex items-start">
                <AlertTriangle className="h-5 w-5 text-indigo-400 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-indigo-300">
                  Pastikan Anda mengunggah gambar berformat PNG yang sebelumnya telah diproses melalui menu Encode. Mengunggah gambar biasa atau JPG (yang terkena kompresi) akan menyebabkan ekstraksi gagal.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Unggah Stego-Image (PNG)</label>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/png" 
                    onChange={(e) => setStegoImage(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-slate-400 mb-3" />
                  <span className="text-base font-medium text-slate-200">{stegoImage ? stegoImage.name : 'Pilih file gambar PNG'}</span>
                  <span className="text-sm text-slate-500 mt-1">Hanya mendukung format PNG (Lossless)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={decodeLSB}
                  disabled={!stegoImage || isProcessing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex justify-center items-center"
                >
                  {isProcessing ? 'Mengekstrak...' : 'Ekstrak File Rahasia'}
                </button>
              </div>

              {extractedFileUrl && (
                <div className="mt-6 p-6 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center overflow-hidden mr-4">
                    <FileKey className="h-8 w-8 text-indigo-400 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-slate-200">File Berhasil Diekstrak</h4>
                      <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{extractedFileName}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={extractedFileUrl} 
                    download={extractedFileName}
                    className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Unduh File
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
