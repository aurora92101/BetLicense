'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { checkoutAction } from '@/lib/payments/actions';
import { Button } from '@/components/ui/button';
import { X, Check, Loader2, ShoppingCart, Search } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PERIODS = [
    { id: 'month', name: '1 month', multiplier: 1 },
    { id: 'year', name: '1 year', multiplier: 10 },
];

function useEscClose(onClose: () => void) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
}

export function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = disabled || pending;

    return (
        <Button
            disabled={isDisabled}
            type="submit"
            className="
        w-full rounded-full flex items-center justify-center gap-2
        transition-colors
        dark:bg-[rgba(106,208,255,0.20)] dark:text-[#6ad0ff]
        dark:border dark:border-[rgba(85,182,255,0.50)]
        dark:hover:bg-[rgba(85,182,255,0.50)]
      "
        >
            {pending ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Payment in progress...
                </>
            ) : (
                <>
                    <ShoppingCart className="w-4 h-4" />
                    Pay
                </>
            )}
        </Button>
    );
}

export default function ModalPayment({ onClose }: { onClose: () => void }) {
    const [selectedBookies, setSelectedBookies] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year'>('month');
    const [showIntroducer, setShowIntroducer] = useState(false);
    const [introducerEmail, setIntroducerEmail] = useState('');
    const unitPrice = 100;

    const { data: bookies = [] } = useSWR<{ id: string; bookieName: string }[]>(
        '/api/bookie',
        fetcher
    );

    const total = useMemo(() => {
        const base = selectedBookies.length * unitPrice;
        const multi = PERIODS.find((p) => p.id === selectedPeriod)?.multiplier ?? 1;
        return base * multi;
    }, [selectedBookies, selectedPeriod]);

    const toggleBook = (id: string) =>
        setSelectedBookies((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );

    const backdropClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    useEscClose(onClose);
    const canSubmit = selectedBookies.length > 0 && total > 0;

    const [bookieQuery, setBookieQuery] = useState('');

    const filteredBookies = useMemo(() => {
        const q = bookieQuery.trim().toLowerCase();
        if (!q) return bookies;
        return bookies.filter((b) => (b.bookieName ?? '').toLowerCase().includes(q));
    }, [bookies, bookieQuery]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // 필요 시 서버 검색 트리거 넣기
        // onSearch?.(bookieQuery)
    }

    function clearQuery() {
        setBookieQuery('');
    }
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={backdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Select payment options"
        >
            <div className="
                relative w-[420px] rounded-xl p-6 shadow-lg border backdrop-blur-md
                bg-white text-gray-900 border-gray-200
                dark:bg-[rgba(10,15,25,0.90)] dark:text-slate-100 dark:border-white/10
                dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]
            ">

                {/* Close */}
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X />
                </button>

                <h2 className="text-xl font-semibold text-center mb-4">Select Payment Options</h2>

                {/* Select Bookies */}
                <div className="mb-5">
                    <h3 className="font-medium mb-2">Select Bookies</h3>

                    <div
                        className="
      rounded-lg border p-0
      border-gray-200 bg-white
      dark:border-white/10 dark:bg-[rgba(12,18,28,0.70)] dark:backdrop-blur
    "
                    >
                        {/* 🔎 검색 툴바 (스크롤 상단에 고정) */}
                        <form onSubmit={handleSubmit}
                            className="
        sticky top-0 z-[1]
        flex items-center gap-2 px-2 py-2
        bg-white/90 backdrop-blur
        dark:bg-[rgba(12,18,28,0.70)]
        border-b border-gray-200 dark:border-white/10
        rounded-t-lg
      "
                            role="search"
                            aria-label="Filter bookies"
                        >
                            <div
                                className="
          flex-1 relative
          rounded-md border
          border-gray-200 bg-white
          dark:bg-[rgba(18,26,38,0.75)] dark:border-white/10
          focus-within:ring-2 focus-within:ring-blue-500/40
        "
                            >
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-400" />
                                <input
                                    value={bookieQuery}
                                    onChange={(e) => setBookieQuery(e.target.value)}
                                    placeholder="Search bookies…"
                                    aria-label="Search bookies"
                                    className="
            w-full bg-transparent outline-none
            pl-8 pr-7 py-2 text-sm
            text-gray-900 dark:text-slate-100
            placeholder:text-gray-400 dark:placeholder:text-slate-500
          "
                                />
                                {bookieQuery && (
                                    <button
                                        type="button"
                                        onClick={clearQuery}
                                        aria-label="Clear search"
                                        className="
              absolute right-1 top-1/2 -translate-y-1/2
              inline-flex items-center justify-center
              h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-white/10
              text-gray-500 dark:text-slate-300
            "
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="
                                    shrink-0 inline-flex items-center gap-1.5
                                    rounded-md px-3 py-2 text-sm
                                    border border-gray-200 bg-white hover:bg-gray-50
                                    dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10
                                    text-gray-700 dark:text-slate-200
                                "
                            >
                                <Search className="h-4 w-4" />
                                <span className="hidden sm:inline">Search</span>
                            </button>
                        </form>

                        {/* 📜 목록 (2컬럼 그리드 + 스크롤) */}
                        <div
                            className="
                                max-h-[200px] overflow-y-auto p-2
                                [&::-webkit-scrollbar]:w-1.5
                                dark:[&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.20)]
                                dark:[&::-webkit-scrollbar-thumb]:rounded
                                grid grid-cols-2 gap-2
                            "
                        >
                            {filteredBookies.map((b) => {
                                const active = selectedBookies.includes(b.id);
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => toggleBook(b.id)}
                                        aria-pressed={active}
                                        className={[
                                            'w-full rounded-lg border px-3 py-2',
                                            'flex items-center justify-between',
                                            'transition-colors',
                                            active
                                                ? 'border-orange-500 bg-orange-50 text-orange-700 ' +
                                                'dark:border-[rgba(85,182,255,0.60)] dark:bg-[rgba(106,208,255,0.20)] dark:text-[#6ad0ff]'
                                                : 'border-gray-200 hover:bg-gray-50 ' +
                                                'dark:border-white/10 dark:hover:bg-white/5',
                                        ].join(' ')}
                                    >
                                        <span className="text-left truncate">{b.bookieName}</span>
                                        <Check
                                            className={
                                                active
                                                    ? 'w-4 h-4 text-orange-500 dark:text-[#6ad0ff]'
                                                    : 'w-4 h-4 opacity-0'
                                            }
                                        />
                                    </button>
                                );
                            })}

                            {filteredBookies.length === 0 && (
                                <div className="col-span-2 text-sm text-gray-500 dark:text-slate-400 py-2">
                                    No bookies found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Select Period */}
                <div className="mb-5">
                    <h3 className="font-medium mb-2">Select Period</h3>
                    <div className="flex gap-3">
                        {PERIODS.map((p) => {
                            const active = selectedPeriod === p.id;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedPeriod(p.id as 'month' | 'year')}
                                    className={[
                                        'flex-1 border rounded-full py-2 transition-colors',
                                        active
                                            ? 'border-orange-500 bg-orange-100 text-orange-700 ' +
                                            'dark:border-[rgba(85,182,255,0.60)] dark:bg-[rgba(106,208,255,0.20)] dark:text-[#6ad0ff]'
                                            : 'border-gray-200 hover:bg-gray-50 ' +
                                            'dark:border-white/10 dark:hover:bg-white/5',
                                    ].join(' ')}
                                >
                                    {p.name}
                                </button>

                            );
                        })}
                    </div>
                </div>

                {/* Introducer Email (optional) */}
                <div className="mb-5">
                    <h3 className="font-medium mb-2">Introducer (Optional)</h3>

                    <button
                        type="button"
                        onClick={() => {
                            setShowIntroducer((v) => !v);
                            if (showIntroducer) setIntroducerEmail('');
                        }}
                        className={[
                            'w-full border rounded-full py-2 transition-colors',
                            showIntroducer
                                ? 'border-orange-500 bg-orange-50 text-orange-600 ' +
                                'dark:border-[rgba(85,182,255,0.60)] dark:bg-[rgba(106,208,255,0.20)] dark:text-[#6ad0ff]'
                                : 'border-gray-300 hover:bg-gray-50 ' +
                                'dark:border-white/10 dark:hover:bg-white/5',
                        ].join(' ')}
                    >
                        {showIntroducer ? 'Remove introducer email' : 'Add introducer email'}
                    </button>


                    {showIntroducer && (
                        <div className="mt-3 animate-in fade-in">
                            <input
                                type="email"
                                placeholder="Enter introducer email"
                                value={introducerEmail}
                                onChange={(e) => setIntroducerEmail(e.target.value)}
                                className="
                                    w-full rounded-full px-3 py-2
                                    border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400
                                    /* 다크에서만 시안 포커스 & 투명 배경 */
                                    dark:bg-[rgba(12,18,28,0.70)] dark:text-slate-100 dark:border-white/10
                                    dark:placeholder:text-slate-400
                                    dark:focus:ring-[rgba(85,182,255,0.60)]
                                "
                            />
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="text-center text-2xl font-bold text-gray-800 dark:text-slate-100 mb-5">
                    Total Amount: £{total.toLocaleString()}
                </div>

                {/* Payment form */}
                <form action={checkoutAction}>
                    <input type="hidden" name="bookies" value={selectedBookies.join(',')} />
                    <input type="hidden" name="period" value={selectedPeriod} />
                    <input type="hidden" name="introducerEmail" value={introducerEmail} />
                    <input type="hidden" name="total" value={String(total)} />
                    <SubmitButton disabled={!canSubmit} />
                </form>

                <div className="mt-3 text-center text-sm text-gray-500 dark:text-[rgba(229,240,255,0.85)]">
                    {selectedBookies.length} selected · {selectedPeriod === 'year' ? '10×' : '1×'} billing
                </div>
            </div>
        </div>
    );
}
