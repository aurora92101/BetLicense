import {NextResponse} from 'next/server';
import {stripe} from '@/lib/payments/stripe';
import {db} from '@/lib/db/drizzle';
import {licenseKey} from '@/lib/db/schema';
import {eq, and} from 'drizzle-orm';
import Stripe from 'stripe';
import {generateLicenseKey} from '@/lib/utils';
import { Resend } from "resend";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET !;
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req : Request) {
    const body = await req.text();
    const sig = req
        .headers
        .get('stripe-signature');
    let event: Stripe.Event;

    try {
        event = stripe
            .webhooks
            .constructEvent(body, sig !, webhookSecret);
    } catch (err : any) {
        console.error('❌ Webhook signature failed:', err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, {status: 400});
    }

    console.log('💬 [Stripe Webhook Received]', event.type);

    try {
        // 1️⃣ 결제 성공 시 (invoice.payment_succeeded)
        if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object as Stripe.Invoice & {
              subscription?: string;
              parent?: { subscription_details?: { subscription?: string } };
            };

            // subscription ID 추출 (fallback 포함)
            let subscriptionId =
              (invoice.subscription as string) ||
              (invoice.parent?.subscription_details?.subscription as string) ||
              undefined;

            if (!subscriptionId) {
              console.warn('⚠️ No subscription ID found in invoice (both fields missing).');
              return NextResponse.json({ received: true });
            }

            // 구독 정보 + 메타데이터 가져오기
            const subscription = await stripe
                .subscriptions
                .retrieve(subscriptionId);
            const meta = subscription.metadata ?? {};
            console.log('📝 Subscription Metadata:', meta);
            const bookies = meta
                    .bookies
                    ?.split(',') ?? meta.bookies?.split(',') ?? [];
            const period = meta.period === 'year'
                ? 'year'
                : 'month';
            const usePeriod = period === 'year'
                ? 12
                : 1;

            const startTime = new Date();
            const endTime = new Date();
            endTime.setMonth(startTime.getMonth() + usePeriod);

            // introducerEmail 처리
            let introducerId: number | null = null;
            if (meta.introducerEmail) {
              const introducer = await db.query.users.findFirst({
                where: (u, { eq }) => eq(u.email, meta.introducerEmail),
              });
              if (introducer) {
                introducerId = introducer.id;
                const now = new Date();

                // 소개자의 현재 활성 라이선스 조회
                const introducerLicenses = await db.query.licenseKey.findMany({
                  where: (l, { and, eq, gt }) =>
                    and(
                      eq(l.userId, Number(introducerId)),
                      eq(l.isBlocked, false),
                      gt(l.endTime, now)
                    ),
                });

                // console.log(`👥 Introducer ${introducer.id} has ${introducerLicenses.length} active licenses.`);

                // for (const lic of introducerLicenses) {
                //   const newEnd = new Date(lic.endTime);
                //   newEnd.setDate(newEnd.getDate() + 7); //  7일 연장

                //   await db
                //     .update(licenseKey)
                //     .set({ endTime: newEnd })
                //     .where(eq(licenseKey.id, lic.id));

                //   console.log(` [Referral Bonus] License ${lic.id} extended to ${newEnd.toISOString()}`);
                // }
                
                // console.log(`Introducer ${introducer.id} (email: ${meta.introducerEmail}) awarded 7-day bonus.`);
                // try {
                //   await resend.emails.send({
                //     from: "BetFriend <onboarding@resend.dev>",
                //     to: "bethoundpro25@outlook.com",
                //     subject: " 7-Day Bonus Extension",
                //     html: `
                //       <p>Hi ${introducer.first_name ?? ""},</p>
                //       <p>Your referral just activated a new license! 🎉</p>
                //       <p>As a thank-you, your active license period has been extended by <b>3 days</b>.</p>
                //       <p>Thank you for helping grow the BetFriend community ⚽</p>
                //       <p style="color:gray;font-size:12px;">If you have questions, please contact support.</p>
                //     `,
                //   });
                //   console.log(` Bonus email sent to ${meta.introducerEmail}`);
                // } catch (e) {
                //   console.error(" Failed to send bonus email:", e);
                // }
              } else {
                console.warn(` Introducer not found: ${meta.introducerEmail}`);
              }
            }

            // 기존 라이선스 있는지 확인
            const existingLicenses = await db
                .query
                .licenseKey
                .findMany({
                    where: (l, {eq}) => eq(l.stripeSubscriptionId, subscriptionId)
                });

            if (existingLicenses.length === 0) {
                // 🎉 첫 결제 성공 → 새 라이선스 발급
                console.log('✅ [Payment Confirmed: License Create]', {
                    userId: meta.userId,
                    period,
                    subscriptionId,
                    bookies,
                    introducerId
                });

                for (const book of bookies) {
                    const bookie = await db
                        .query
                        .bookie
                        .findFirst({
                            where: (b, {eq}) => eq(b.id, Number(book))
                        });
                    if (!bookie) {
                        console.warn(`⚠️ Bookie not found: ${book}`);
                        continue;
                    }

                    await db
                        .insert(licenseKey)
                        .values({
                            userId: Number(meta.userId),
                            bookieId: bookie.id,
                            keyName: generateLicenseKey(),
                            usePeriod: usePeriod.toString(),
                            introducerId,
                            startTime,
                            endTime,
                            stripeSubscriptionId: subscriptionId,
                            isBlocked: false,
                            isRunning: true,
                            isAutoPay: true
                        });

                    console.log(
                        `🔑 [License Created] ${bookie.bookieName} → ${endTime.toISOString()}`
                    );
                }
            } else {
                // 🔁 자동 결제 갱신 → 라이선스 기간 연장
                console.log(`🔁 [License Renewal] ${subscriptionId}`);

                for (const lic of existingLicenses) {
                    const newEndTime = new Date(lic.endTime);
                    newEndTime.setMonth(newEndTime.getMonth() + usePeriod);

                    await db
                        .update(licenseKey)
                        .set({endTime: newEndTime, isBlocked: false, isRunning: true})
                        .where(
                            and(eq(licenseKey.id, lic.id), eq(licenseKey.stripeSubscriptionId, subscriptionId))
                        );

                    console.log(`✅ [License Extended] id=${lic.id} → ${newEndTime.toISOString()}`);
                }
            }
        }

        // 2️⃣ 구독 상태 변경 (취소 / 재활성화 / 결제 실패 등)
        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription & {
                current_period_end: number;
                cancel_at_period_end: boolean;
            };
            const status = subscription.status;
            const subscriptionId = subscription.id;

            console.log(`⚙️ [Subscription Update] ${subscriptionId} → ${status}`);

            // 🟡 1️⃣ 자동결제 해지 (취소 예약)
            if (subscription.cancel_at_period_end) {
                await db
                    .update(licenseKey)
                    .set({
                        isAutoPay: false, // 자동결제 꺼짐
                        isRunning: true, // 여전히 사용 중
                        isBlocked: false, // 차단 안 함
                    })
                    .where(eq(licenseKey.stripeSubscriptionId, subscriptionId));
                    console.log('⚠️ [AutoPay Disabled] (license still active until endTime)');
            }

            // ❌ 2️⃣ 완전 취소 or 결제 실패
            if (['canceled', 'unpaid', 'incomplete_expired', 'paused'].includes(status)) {
                await db
                    .update(licenseKey)
                    .set({isBlocked: true, isRunning: false, isAutoPay: false})
                    .where(eq(licenseKey.stripeSubscriptionId, subscriptionId));

                console.log(`🧱 [License Blocked] subscription ${subscriptionId}`);
            }

            // 3️⃣ 재구독 or 재활성화
            if (['active', 'trialing'].includes(status) && !subscription.cancel_at_period_end) {
                await db
                    .update(licenseKey)
                    .set({isBlocked: false, isRunning: true, isAutoPay: true})
                    .where(eq(licenseKey.stripeSubscriptionId, subscriptionId));

                console.log(`✅ [License Reactivated] subscription ${subscriptionId}`);
            }
        }

        // 3️⃣ Checkout 완료 이벤트 (참고용 로그)
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log('💰 [Checkout Completed]', {
                sessionId: session.id,
                subscription: session.subscription
            });
        }

        return NextResponse.json({received: true});
    } catch (err
    : any) {
        console.error('❌ Webhook processing error:', err);
        return new NextResponse('Internal Server Error', {status: 500});
    }
}
