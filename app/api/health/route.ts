import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongodb';

export async function GET() {
  try {
    await connectToDatabase();
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return NextResponse.json({ status: 'error', db: 'disconnected', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
