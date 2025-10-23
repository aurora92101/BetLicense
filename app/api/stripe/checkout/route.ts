import { NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    console.warn('⚠️ Missing session_id in checkout success URL');
    return NextResponse.redirect(new URL('/dashboard/license?status=error', request.url));
  }

  try {
    // Checkout 세션 조회
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const subscription = session.subscription as Stripe.Subscription | null;
    const customer = session.customer as Stripe.Customer | null;
    const userId = Number(session.metadata?.userId);

    console.log('💳 [Stripe Checkout Return] session:', {
      sessionId,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id,
      userId,
    });

    // 결제 성공 시 DB 업데이트
    if (session.payment_status === 'paid' && subscription && userId) {
      await db
        .update(users)
        .set({
          stripeCustomerId: customer?.id ?? null,
          stripeSubscriptionId: subscription.id,
          stripeProductId: subscription.items.data[0].price.product as string,
          planName: subscription.items.data[0].price.nickname ?? `Bookie ${session.metadata?.period ?? ''}`,
          subscriptionStatus: subscription.status,
        })
        .where(eq(users.id, userId));

      console.log(`✅ [Checkout Success] user ${userId} updated`);
      return NextResponse.redirect(new URL('/dashboard/license?status=success', request.url));
    }

    // ⚠️ 결제 실패 또는 미완료
    console.warn('⚠️ Payment not completed:', session.payment_status);
    return NextResponse.redirect(new URL('/dashboard/license?status=failed', request.url));
  } catch (err: any) {
    console.error('❌ Stripe checkout verification failed:', err.message);
    return NextResponse.redirect(new URL('/dashboard/license?status=error', request.url));
  }
}
