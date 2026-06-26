import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getPlanAndUsage, dbConfigured } from '@/lib/usageDb';
import { PLANS, getPlanById } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const client = await clerkClient();

  // Gate: only users flagged as admin in Clerk (publicMetadata.role === 'admin').
  const me = await client.users.getUser(userId);
  if ((me.publicMetadata?.role as string) !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: clerkUsers, totalCount } = await client.users.getUserList({ limit: 200, orderBy: '-created_at' });

  const users = await Promise.all(clerkUsers.map(async (u) => {
    const { plan, analyses } = await getPlanAndUsage(u.id);
    const email = u.emailAddresses.find(e => e.id === u.primaryEmailAddressId)?.emailAddress
      || u.emailAddresses[0]?.emailAddress || '—';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '—';
    return {
      id: u.id,
      email,
      name,
      plan,
      planName: getPlanById(plan).name,
      price: getPlanById(plan).price,
      analyses,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
    };
  }));

  // Per-plan breakdown + cumulative monthly revenue (selected plans; billing not live yet).
  const planSummary = PLANS.map(p => {
    const count = users.filter(u => u.plan === p.id).length;
    return { id: p.id, name: p.name, price: p.price, count, revenue: +(count * p.price).toFixed(2) };
  });
  const mrr = +planSummary.reduce((s, p) => s + p.revenue, 0).toFixed(2);

  return NextResponse.json({
    configured: dbConfigured(),
    totalUsers: totalCount,
    mrr,
    planSummary,
    users,
  });
}
