// app/checkout-error/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function CheckoutErrorPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const msg = searchParams.get('msg');

    // 사용자에게 보여줄 메시지 매핑
    const messageMap: Record<string, string> = {
        invalid_input: 'Invalid input. Please check your payment details.',
        introducer_not_found: 'Introducer email not found in system.',
        checkout_failed: 'Failed to create checkout session.',
        default: 'Something went wrong during checkout.',
    };

    const message = messageMap[msg || 'default'];

    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-red-500" />
            <h1 className="text-2xl font-semibold text-gray-800">
                Payment Failed
            </h1>
            <p className="text-gray-600 max-w-sm">{message}</p>

            <div className="space-x-4">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="rounded-full"
                >
                    Go Back
                </Button>
                <Button
                    onClick={() => router.push('/')}
                    className="rounded-full bg-orange-500 hover:bg-orange-600"
                >
                    Return to Dashboard
                </Button>
            </div>
        </div>
    );
}
