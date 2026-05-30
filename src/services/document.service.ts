import mongoose from 'mongoose';
import { 
  generateFileKey, 
  encryptFileData, 
  decryptFileData, 
  hashFile, 
  signHash, 
  verifySignature, 
  encryptKeyWithRSA, 
  decryptKeyWithRSA,
  decryptPrivateKey
} from '../crypto';
import { createTemporaryShare } from '../lib/temporaryShareStore';
import { User } from '../models/User';
import { Document } from '../models/Document';
import { SharedAccess } from '../models/SharedAccess';
import { ActivityLog } from '../models/ActivityLog';
import { connectDB } from '../lib/mongoose';

let gridFSBucket: mongoose.mongo.GridFSBucket;
function getGridFSBucket() {
  if (!gridFSBucket) {
    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
      bucketName: 'documents'
    });
  }
  return gridFSBucket;
}

interface DownloadDocumentResult {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export class DocumentService {
  static async uploadDocument(
    userId: string,
    vaultPassword: string,
    file: File,
    customShareCode?: string,
    docType: 'FILE' | 'NOTE' = 'FILE',
    folderId?: string
  ) {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Decrypt User's Private Key to sign the file
    let privateKeyPEM: string;
    try {
      privateKeyPEM = decryptPrivateKey(user.encryptedPrivKey, vaultPassword);
    } catch (error: unknown) {
      console.error('Decryption error details:', error);
      throw new Error('Invalid vault password provided for cryptographic signing');
    }

    // 2. Hash and Sign the original file
    const fileHash = hashFile(fileBuffer);
    const signature = signHash(fileHash, privateKeyPEM);

    // 3. Generate AES Key and Encrypt File
    const aesKey = generateFileKey();
    const { encryptedBuffer, iv, tag } = encryptFileData(fileBuffer, aesKey);

    // Prepare final binary format: IV (12 bytes) + Tag (16 bytes) + Encrypted Data
    const finalEncryptedData = Buffer.concat([iv, tag, encryptedBuffer]);
    
    // Save to GridFS
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(`${Date.now()}-${file.name}.enc`);
    uploadStream.end(finalEncryptedData);
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });
    const storagePath = uploadStream.id.toString();

    // 4. Encrypt the AES Key with the User's own Public Key so they can decrypt it later
    const encryptedFileKey = encryptKeyWithRSA(aesKey, user.publicKey);

    // 5. Store metadata in DB
    const document = await Document.create({
      title: file.name,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      storagePath,
      fileHash,
      signature,
      type: docType,
      folderId: folderId || null,
      status: 'ACTIVE',
      ownerId: user._id
    });

    const documentIdString = document._id.toString();

    // 6. Create initial SharedAccess record for the owner
    await SharedAccess.create({
      documentId: document._id,
      userId: user._id,
      encryptedFileKey,
      grantedBy: user._id
    });

    if (customShareCode) {
      await createTemporaryShare(
        documentIdString,
        userId,
        document.mimeType,
        document.originalName,
        aesKey,
        24 * 60, // 24 hours expiry
        100, // max access
        customShareCode
      );
    }

    return {
      id: documentIdString,
      title: document.title,
      createdAt: document.createdAt
    };
  }

  static async downloadDocument(userId: string, vaultPassword: string, documentId: string): Promise<DownloadDocumentResult> {
    await connectDB();
    // 1. Verify access
    const access = await SharedAccess.findOne({ documentId, userId })
      .populate({
        path: 'documentId',
        populate: { path: 'ownerId' }
      })
      .populate('userId');

    if (!access) {
      throw new Error('Unauthorized or document not found');
    }

    const document: any = access.documentId;
    const user: any = access.userId;

    if (!document || document.status !== 'ACTIVE') {
      throw new Error('Unauthorized or document not found');
    }

    // 2. Decrypt User's Private Key
    let privateKeyPEM: string;
    try {
      privateKeyPEM = decryptPrivateKey(user.encryptedPrivKey, vaultPassword);
    } catch (e) {
      throw new Error('Invalid vault password provided for cryptographic decryption');
    }

    // 3. Decrypt the AES Key using User's Private Key
    const aesKey = decryptKeyWithRSA(access.encryptedFileKey, privateKeyPEM);

    // 4. Read encrypted file from GridFS
    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(document.storagePath));
    const chunks: Buffer[] = [];
    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      downloadStream.on('error', reject);
      downloadStream.on('end', resolve);
    });
    const fileData = Buffer.concat(chunks);
    const iv = fileData.subarray(0, 12);
    const tag = fileData.subarray(12, 28);
    const encryptedBuffer = fileData.subarray(28);

    // 5. Decrypt the file
    const originalFileBuffer = decryptFileData(encryptedBuffer, aesKey, iv, tag);

    // 6. Verify Hash and Signature (Anti-tampering)
    const currentHash = hashFile(originalFileBuffer);
    if (currentHash !== document.fileHash) {
      throw new Error('TAMPERING DETECTED: File hash mismatch');
    }

    const isValidSignature = verifySignature(currentHash, document.signature, document.ownerId.publicKey);
    if (!isValidSignature) {
      throw new Error('TAMPERING DETECTED: Invalid digital signature');
    }

    return {
      buffer: originalFileBuffer,
      mimeType: document.mimeType,
      originalName: document.originalName
    };
  }

  static async downloadDocumentWithAesKey(documentId: string, aesKey: Buffer): Promise<DownloadDocumentResult> {
    await connectDB();
    const document = await Document.findById(documentId).populate('ownerId');

    if (!document || document.status !== 'ACTIVE') {
      throw new Error('Document not found');
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(document.storagePath));
    const chunks: Buffer[] = [];
    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      downloadStream.on('error', reject);
      downloadStream.on('end', resolve);
    });
    const fileData = Buffer.concat(chunks);
    const iv = fileData.subarray(0, 12);
    const tag = fileData.subarray(12, 28);
    const encryptedBuffer = fileData.subarray(28);

    const originalFileBuffer = decryptFileData(encryptedBuffer, aesKey, iv, tag);

    const currentHash = hashFile(originalFileBuffer);
    if (currentHash !== document.fileHash) {
      throw new Error('TAMPERING DETECTED: File hash mismatch');
    }

    const owner: any = document.ownerId;
    const isValidSignature = verifySignature(currentHash, document.signature, owner.publicKey);
    if (!isValidSignature) {
      throw new Error('TAMPERING DETECTED: Invalid digital signature');
    }

    return {
      buffer: originalFileBuffer,
      mimeType: document.mimeType,
      originalName: document.originalName
    };
  }

  static async shareDocument(
    ownerId: string, 
    ownerVaultPassword: string, 
    documentId: string, 
    targetUserEmail: string
  ) {
    await connectDB();
    const ownerAccess = await SharedAccess.findOne({ documentId, userId: ownerId })
      .populate('userId')
      .populate('documentId');

    if (!ownerAccess) {
      throw new Error('You do not have access to share this document');
    }

    const document: any = ownerAccess.documentId;
    if (!document || document.status !== 'ACTIVE') {
       throw new Error('You do not have access to share this document');
    }

    const targetUserEmailLower = targetUserEmail.trim().toLowerCase();
    const targetUser = await User.findOne({ email: targetUserEmailLower });
    
    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Check if already shared
    const existingShare = await SharedAccess.findOne({ documentId, userId: targetUser._id });

    if (existingShare) {
      throw new Error('Document already shared with this user');
    }

    const ownerUser: any = ownerAccess.userId;

    // 1. Decrypt Owner's Private Key
    let ownerPrivateKeyPEM: string;
    try {
      ownerPrivateKeyPEM = decryptPrivateKey(ownerUser.encryptedPrivKey, ownerVaultPassword);
    } catch (e) {
      throw new Error('Invalid vault password provided for cryptographic operation');
    }

    // 2. Decrypt the AES Key
    const aesKey = decryptKeyWithRSA(ownerAccess.encryptedFileKey, ownerPrivateKeyPEM);

    // 3. Encrypt the AES Key with the Target User's Public Key
    const newEncryptedFileKey = encryptKeyWithRSA(aesKey, targetUser.publicKey);

    // 4. Save the new access record
    await SharedAccess.create({
      documentId,
      userId: targetUser._id,
      encryptedFileKey: newEncryptedFileKey,
      grantedBy: ownerId
    });

    return { message: 'Document shared successfully' };
  }

  static async deleteDocument(userId: string, documentId: string) {
    await connectDB();
    const document = await Document.findById(documentId);

    if (!document || document.ownerId.toString() !== userId || document.status !== 'ACTIVE') {
      throw new Error('Document not found or access denied');
    }

    try {
      const bucket = getGridFSBucket();
      await bucket.delete(new mongoose.Types.ObjectId(document.storagePath));
    } catch (err) {
      // ignore missing file errors, but still proceed with DB cleanup
    }

    await SharedAccess.deleteMany({ documentId });

    await Document.updateOne({ _id: documentId }, { status: 'DELETED' });

    await ActivityLog.create({
      userId,
      action: 'DELETE',
      resourceId: documentId,
      status: 'SUCCESS'
    });

    return { message: 'Document deleted successfully' };
  }
}
