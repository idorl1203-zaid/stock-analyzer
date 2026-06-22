import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllUserData, setUserData, userDataConfigured, SYNC_COLLECTIONS, type SyncCollection } from '@/lib/userDataDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!userDataConfigured()) return NextResponse.json({ configured: false });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await getAllUserData(userId);
  return NextResponse.json({ configured: true, data });
}

export async function POST(request: NextRequest) {
  if (!userDataConfigured()) return NextResponse.json({ configured: false });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { collection, value } = await request.json().catch(() => ({}));
  if (!SYNC_COLLECTIONS.includes(collection)) {
    return NextResponse.json({ error: 'invalid collection' }, { status: 400 });
  }
  const ok = await setUserData(userId, collection as SyncCollection, value);
  return NextResponse.json({ configured: true, ok });
}
