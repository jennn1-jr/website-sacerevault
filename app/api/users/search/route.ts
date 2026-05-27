import { NextRequest } from 'next/server';
import { getSession } from '@/src/utils/auth';
import { sendSuccess, sendError } from '@/src/utils/response';
import { connectDB } from '@/src/lib/mongoose';
import { User } from '@/src/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return sendError('Unauthorized', null, 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return sendError('Email parameter is required', null, 400);
    }

    await connectDB();

    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: session.userId }
    })
      .select('id name email')
      .limit(5);

    const mappedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email
    }));

    return sendSuccess(mappedUsers);
  } catch (error: unknown) {
    return sendError('Internal server error', error, 500);
  }
}
