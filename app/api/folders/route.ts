import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { Folder } from '@/src/models/Folder';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    await connectDB();
    const parentIdParam = request.nextUrl.searchParams.get('parentId');
    
    // If parentId is 'null', fetch root folders. Otherwise fetch by parentId.
    // If not provided, fetch all folders for this user.
    let query: any = { ownerId: session.userId };
    if (parentIdParam !== null) {
      query.parentId = parentIdParam === 'null' ? null : parentIdParam;
    }

    const folders = await Folder.find(query).sort({ name: 1 });
    
    const serialized = folders.map(f => ({
      id: f._id.toString(),
      name: f.name,
      parentId: f.parentId ? f.parentId.toString() : null,
      createdAt: f.createdAt
    }));

    return sendSuccess(serialized, 'Folders retrieved successfully');
  } catch (error: unknown) {
    return sendError('Failed to retrieve folders', error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const body = await request.json();
    const { name, parentId } = body;

    if (!name || name.trim() === '') {
      return sendError('Folder name is required', null, 400);
    }

    await connectDB();
    
    const folder = await Folder.create({
      name: name.trim(),
      ownerId: session.userId,
      parentId: parentId || null
    });

    return sendSuccess({
      id: folder._id.toString(),
      name: folder.name,
      parentId: folder.parentId ? folder.parentId.toString() : null,
      createdAt: folder.createdAt
    }, 'Folder created successfully', 201);
  } catch (error: unknown) {
    return sendError('Failed to create folder', error, 500);
  }
}
