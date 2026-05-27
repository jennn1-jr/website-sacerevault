require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  console.log("=========================================");
  console.log("🔍 MENGECEK KONEKSI DATABASE SECUREVAULT");
  console.log("=========================================");
  console.log("DATABASE_URL:", process.env.DATABASE_URL || "Belum diset di .env");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL tidak ditemukan di file .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Berhasil terhubung ke MongoDB!");

    const db = mongoose.connection.db;

    // 1. Ambil info Users
    const users = await db.collection('users').find({}).toArray();
    console.log(`\n👥 Daftar User (${users.length}):`);
    users.forEach(u => {
      console.log(`   - [${u.role || 'USER'}] ${u.name} (${u.email})`);
    });

    // 2. Ambil info Active Sessions (Sesi Login)
    const sessions = await db.collection('sessions').find({}).toArray();
    console.log(`\n🔑 Sesi Login Aktif (${sessions.length}):`);
    if (sessions.length === 0) {
      console.log("   (Tidak ada sesi login aktif)");
    } else {
      sessions.forEach(s => {
        const user = users.find(u => u._id.toString() === s.userId?.toString());
        console.log(`   - User: ${user ? user.email : s.userId} | Expires: ${new Date(s.expiresAt).toLocaleString()}`);
      });
    }

    // 3. Ambil info Activity Logs
    const logs = await db.collection('activitylogs').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log(`\n📝 5 Log Aktivitas Terakhir (${logs.length}):`);
    if (logs.length === 0) {
      console.log("   (Belum ada aktivitas tercatat)");
    } else {
      logs.forEach(l => {
        const user = users.find(u => u._id.toString() === l.userId?.toString());
        console.log(`   - [${new Date(l.createdAt).toLocaleString()}] ${user ? user.email : 'Unknown'} -> Action: ${l.action} | Status: ${l.status}`);
      });
    }

    // 4. Ambil info Documents
    const documents = await db.collection('documents').find({ status: 'ACTIVE' }).toArray();
    console.log(`\n📁 File Dokumen Aktif (${documents.length}):`);
    documents.forEach(d => {
      const user = users.find(u => u._id.toString() === d.ownerId?.toString());
      console.log(`   - ${d.title} (${(d.size / 1024).toFixed(2)} KB) | Owner: ${user ? user.email : 'Unknown'}`);
    });

  } catch (error) {
    console.error("❌ Koneksi database gagal:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n=========================================");
    console.log("🔌 Koneksi database ditutup.");
    console.log("=========================================");
  }
}

main().catch(console.error);
