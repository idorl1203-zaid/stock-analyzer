import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAccount, setAccountPlan, dbConfigured } from '@/lib/usageDb';
import type { PlanId } from '@/lib/plans';

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ configured: false });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const acct = await getAccount(userId);
  return NextResponse.json({ configured: true, ...acct });
}

export async function POST(request: NextRequest) {
  if (!dbConfigured()) return NextResponse.json({ configured: false });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { plan } = await request.json().catch(() => ({}));
  const ok = await setAccountPlan(userId, plan as PlanId);
  if (!ok) return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
  const acct = await getAccount(userId);
  return NextResponse.json({ configured: true, ...acct });
}
