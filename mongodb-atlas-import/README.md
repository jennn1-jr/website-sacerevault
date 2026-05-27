# 🗄️ SecureVault - MongoDB Atlas Import Guide

## Database: `securevault`

Folder ini berisi file JSON untuk semua koleksi (collection) yang perlu diimport ke MongoDB Atlas.

---

## 📁 Daftar File & Koleksi

| File JSON | Nama Collection | Keterangan |
|---|---|---|
| `users.json` | `users` | Data user dengan RSA public/private key (terenkripsi) |
| `sessions.json` | `sessions` | Session login (refresh token) |
| `activitylogs.json` | `activitylogs` | Log aktivitas (login, upload, dll) |
| `documents.json` | `documents` | Metadata dokumen terenkripsi |
| `sharedaccesses.json` | `sharedaccesses` | Akses berbagi dokumen antar user |
| `notifications.json` | `notifications` | Notifikasi sistem |
| `devices.json` | `devices` | Perangkat terdaftar (kosong, terisi otomatis) |
| `temporaryshares.json` | `temporaryshares` | Share link sementara (kosong, terisi otomatis) |

---

## 🚀 Cara Import ke MongoDB Atlas

### Metode 1: Via MongoDB Atlas UI (Direkomendasikan)

1. Buka **[MongoDB Atlas](https://cloud.mongodb.com/)** dan login
2. Pilih cluster **sacarevault** di bagian kiri
3. Klik **"Browse Collections"**
4. Jika database `securevault` belum ada, klik **"Create Database"**
   - Database name: `securevault`
   - Collection name: `users`
5. Untuk setiap file JSON di folder ini:
   - Klik nama collection (atau buat baru jika belum ada)
   - Klik tombol **"ADD DATA"** → **"Import JSON or CSV file"**
   - Pilih file JSON yang sesuai
   - Klik **"Import"**

### Metode 2: Via mongoimport (CLI)

Jika Anda memiliki MongoDB Tools terinstal, jalankan perintah berikut:

```bash
# Ganti <CONNECTION_STRING> dengan connection string Atlas Anda
# Contoh: mongodb+srv://user:password@sacarevault.evcpuiy.mongodb.net/

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=users --file=users.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=sessions --file=sessions.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=activitylogs --file=activitylogs.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=documents --file=documents.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=sharedaccesses --file=sharedaccesses.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=notifications --file=notifications.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=devices --file=devices.json --jsonArray

mongoimport --uri="<CONNECTION_STRING>" \
  --db=securevault --collection=temporaryshares --file=temporaryshares.json --jsonArray
```

---

## 🔐 Schema Koleksi

### `users`
```json
{
  "_id": "ObjectId",
  "name": "string (required)",
  "email": "string (required, unique)",
  "passwordHash": "string (bcrypt)",
  "publicKey": "string (RSA-4096 PEM)",
  "encryptedPrivKey": "string (AES-256-GCM + PBKDF2, base64)",
  "role": "USER | ADMIN",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `documents`
```json
{
  "_id": "ObjectId",
  "title": "string (required)",
  "originalName": "string (required)",
  "mimeType": "string (required)",
  "size": "number (bytes, required)",
  "storagePath": "string (path to .enc file on server)",
  "fileHash": "string (SHA-256 hex)",
  "signature": "string (RSA digital signature, base64)",
  "status": "ACTIVE | DELETED",
  "ownerId": "ObjectId (ref: users)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `sharedaccesses`
```json
{
  "_id": "ObjectId",
  "documentId": "ObjectId (ref: documents)",
  "userId": "ObjectId (ref: users)",
  "encryptedFileKey": "string (AES key encrypted with user's RSA public key, base64)",
  "grantedBy": "ObjectId (ref: users)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `sessions`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "deviceId": "ObjectId (ref: devices, or fallback to userId)",
  "token": "string (JWT refresh token, unique)",
  "expiresAt": "Date",
  "ipAddress": "string (optional)",
  "userAgent": "string (optional)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `activitylogs`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "action": "LOGIN | UPLOAD | DOWNLOAD | SHARE | DELETE",
  "resourceId": "ObjectId (ref: documents, optional)",
  "status": "SUCCESS | FAILED",
  "ipAddress": "string (optional)",
  "userAgent": "string (optional)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `notifications`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "title": "string (required)",
  "message": "string (required)",
  "type": "string (required, e.g. SHARE, SYSTEM)",
  "isRead": "boolean (default: false)",
  "actionUrl": "string (optional)",
  "data": "string (optional, JSON string)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `devices`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "deviceName": "string (required)",
  "deviceId": "string (required, unique)",
  "publicKey": "string (device public key)",
  "lastSeen": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `temporaryshares`
```json
{
  "_id": "ObjectId",
  "documentId": "ObjectId (ref: documents)",
  "createdBy": "ObjectId (ref: users)",
  "token": "string (unique share token)",
  "encryptedFileKey": "string (AES key, base64)",
  "mimeType": "string",
  "originalName": "string",
  "expiresAt": "Date",
  "maxAccess": "number",
  "accessCount": "number (default: 0)",
  "status": "ACTIVE | EXPIRED | REVOKED",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## ⚙️ Indexes yang Disarankan

Setelah import, buat indexes berikut di Atlas untuk performa optimal:

```javascript
// Collection: users
db.users.createIndex({ email: 1 }, { unique: true })

// Collection: sessions
db.sessions.createIndex({ token: 1 }, { unique: true })
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL Index

// Collection: documents
db.documents.createIndex({ ownerId: 1, status: 1 })

// Collection: sharedaccesses
db.sharedaccesses.createIndex({ documentId: 1, userId: 1 }, { unique: true })

// Collection: activitylogs
db.activitylogs.createIndex({ userId: 1, createdAt: -1 })

// Collection: temporaryshares
db.temporaryshares.createIndex({ token: 1 }, { unique: true })
db.temporaryshares.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL Index
```

---

## 👤 Akun Demo yang Tersedia

| Email | Password | Vault Password | Role |
|---|---|---|---|
| `bintangwira3@gmail.com` | *(diatur saat registrasi)* | *(diatur saat registrasi)* | USER |
| `bintangwira9@gmail.com` | *(diatur saat registrasi)* | *(diatur saat registrasi)* | USER |

> ⚠️ **Catatan Keamanan**: `passwordHash` dan `encryptedPrivKey` adalah data kriptografis nyata. Jangan bagikan file ini secara publik.
