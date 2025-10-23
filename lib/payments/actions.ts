'use server';

import { redirect } from 'next/navigation';
import { withUser } from '@/lib/auth/middleware';
import { createSubscriptionSession, createCustomerPortalSession } from '@/lib/payments/stripe';
import { getUserByEmail } from '@/lib/db/users';
import { getUser } from '@/lib/db/queries';

/**
 * 결제 처리 Server Action
 * - ModalPayment.tsx에서 form으로 전달받은 데이터를 처리
 * - Stripe Checkout 세션 생성 후 redirect
 */
export const checkoutAction = withUser(async (formData, user) => {
  // 폼 데이터 읽기
  const bookies = formData.get('bookies')?.toString().split(',') || [];
  const period = formData.get('period')?.toString() || 'month';
  const total = Number(formData.get('total'));
  const introducerEmail = formData.get('introducerEmail')?.toString() || '';

  if (!bookies.length) {
    redirect(`/checkout-error?msg=bookie_required`);
  }

  if (!total || total <= 0) {
    redirect(`/checkout-error?msg=invalid_total`);
  }

  // introducerEmail이 입력된 경우에만 DB 검증 수행
  let introducer = null;
  if (introducerEmail) {
    introducer = await getUserByEmail(introducerEmail);

    if (!introducer) {
      redirect(`/checkout-error?msg=introducer_not_found`);
    }
  }

  // Stripe Checkout 세션 생성
  const session = await createSubscriptionSession({
    user,       // 현재 로그인된 사용자
    bookies,      // 선택한 부키 리스트
    period,     // 선택한 기간 (1m / 1y)
    introducer, // 소개자 유저 정보
    total,      // 계산된 총금액 ($ 단위)
  });

  // Stripe 결제 페이지로 리다이렉트
  if (!session.url) {
    redirect(`/checkout-error?msg=checkout_failed`);
  }

  redirect(session.url);
});

export const customerPortalAction = async () => {
  // 현재 로그인된 유저 확인
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Stripe Billing Portal 세션 생성
  const portalSession = await createCustomerPortalSession(user);

  // Billing Portal로 리디렉션
  redirect(portalSession.url);
};