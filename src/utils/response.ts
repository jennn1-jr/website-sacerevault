import { NextResponse } from 'next/server';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export function sendSuccess<T>(data: T, message: string = 'Success', status: number = 200) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    message,
    data
  }, { status });
}

export function sendError(message: string, error?: unknown, status: number = 500) {
  if (error) {
    console.error(`[API ERROR ${status}] ${message}:`, error);
  } else {
    console.error(`[API ERROR ${status}] ${message}`);
  }
  return NextResponse.json<ApiResponse>({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  }, { status });
}
