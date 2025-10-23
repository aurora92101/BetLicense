// lib/payments/stripe.ts
import Stripe from 'stripe';

import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import { Team } from '@/lib/db/schema';
import { redirect } from 'next/navigation';

import { updateUserStripeId } from '@/lib/db/users';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function createSubscriptionSession({
  user,
  bookies,
  period,
  introducer,
  total,
}: {
  user: { id: string; email?: string; stripeCustomerId?: string };
  bookies: string[];
  period: string;
  introducer?: { email?: string } | null;
  total: number;
}) {
  if (!user?.id) throw new Error('User required');
  if (!bookies.length) throw new Error('Books required');

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { appUserId: user.id },
    });
    customerId = customer.id;
    await updateUserStripeId(user.id, customer.id);
  }

  // Price ID 선택
  const priceId =
    period === 'year'
      ? process.env.STRIPE_PRICE_ID_YEARLY!
      : process.env.STRIPE_PRICE_ID_MONTHLY!;

  // Checkout 세션 생성
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: bookies.length }],
    customer: customerId,
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/dashboard/license`,
    // (1) 구독에도 메타데이터 추가 (핵심)
    subscription_data: {
      metadata: {
        userId: user.id,
        bookies: bookies.join(','),
        period,
        introducerEmail: introducer?.email ?? '',
        total: total.toString(),
      },
    },
    metadata: {
      userId: user.id,
      bookies: bookies.join(','),
      period,
      introducerEmail: introducer?.email ?? '',
      total: total.toString(),
    },
  });

  return session;
}

//old
export async function createCheckoutSession({
  team,
  priceId
}: {
  team: Team | null;
  priceId: string;
}) {
  const user = await getUser();

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14
    }
  });

  redirect(session.url!);
}

/**
 * Stripe Billing Portal 세션 생성
 * 사용자가 자신의 구독(자동결제) 관리 화면으로 이동할 수 있게 함.
 * - 결제 카드 변경
 * - 구독 취소
 * - 청구 내역 확인
 * - 자동결제 재개 등 가능
 */
export async function createCustomerPortalSession(user?: {
  id: number;
  stripeCustomerId?: string | null;
  stripeProductId?: string | null;
}) {
  // 유저 확인
  if (!user) {
    const dbUser = await getUser();
    if (!dbUser) redirect('/sign-in');
    user = dbUser;
  }

  if (!user?.stripeCustomerId) {
    redirect('/dashboard/license');
  }

  // Stripe Billing Portal Configuration 확인
  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    // ProductId는 PriceId로부터 추적 가능하지만,
    // 사용자의 productId가 없을 경우 기본 Price에서 Product을 가져옴
    const priceId =
      process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_YEARLY;

    const defaultPrice = await stripe.prices.retrieve(priceId!);
    const product = await stripe.products.retrieve(
      typeof defaultPrice.product === 'string'
        ? defaultPrice.product
        : defaultPrice.product.id
    );

    if (!product.active) {
      throw new Error("User's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    if (prices.data.length === 0) {
      throw new Error('No active prices found for the product');
    }

    // Billing Portal 기본 configuration 생성
    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your Bookie subscription',
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id),
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end', // 현재 결제 기간이 끝날 때 해지
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other',
            ],
          },
        },
        payment_method_update: {
          enabled: true,
        },
      },
    });
  }

  // Billing Portal 세션 생성
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${process.env.BASE_URL}/dashboard/license`,
    configuration: configuration.id,
  });

  return portalSession;
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscriptionId,
      stripeProductId: plan?.product as string,
      planName: (plan?.product as Stripe.Product).name,
      subscriptionStatus: status
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    await updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status
    });
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
