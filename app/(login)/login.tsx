'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { useState } from 'react';

/** 인라인 비밀번호 초기화 — 다크모드에서 결제모달과 동일 톤 */
function ForgotPasswordInline() {
  const [stage, setStage] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = async () => {
    setLoading(true); setMsg(null);
    const res = await fetch('/api/password/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setStage('code');
      setMsg('We sent a 6-digit code to your email. (Expires in 15 minutes)');
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || 'Failed to request reset code');
    }
  };

  const verify = async () => {
    setLoading(true); setMsg(null);
    const res = await fetch('/api/password/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg(
        j.tempPassword
          ? `Password reset to ${j.tempPassword}. Please sign in and change it.`
          : 'Password reset. Check your email for the temporary password.'
      );
      setStage('done');
    } else {
      setMsg(j.error || 'Invalid or expired code');
    }
  };

  return (
    <div className="mt-6 space-y-3">
      {stage === 'email' && (
        <>
          <Input
            type="email"
            placeholder="Enter Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Button
            disabled={loading || !email}
            onClick={request}
            className="w-full rounded-full font-medium"

          >
            {loading ? 'Sending...' : 'Send reset code'}
          </Button>
        </>
      )}

      {stage === 'code' && (
        <>
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            maxLength={6}
            onChange={e => setCode(e.target.value)}
          />
          <Button
            disabled={loading || code.length !== 6}
            onClick={verify}
            className="w-full rounded-full font-medium"

          >
            {loading ? 'Verifying...' : 'Verify & Reset'}
          </Button>
        </>
      )}

      {stage === 'done' && (
        <div className="text-sm text-green-600 dark:text-emerald-300">
          {msg ?? 'Your password was reset.'}
        </div>
      )}

      {!!msg && stage !== 'done' && (
        <div className="text-xs text-gray-600 dark:text-slate-400">{msg}</div>
      )}
    </div>
  );
}

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div
      className="
        min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8
        bg-gray-50
        /* 다크: 결제모달과 동일한 배경 톤 + 블러 */
        dark:bg-[rgba(10,15,25,0.90)] dark:backdrop-blur-md
      "
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500 dark:text-[#6ad0ff]" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </h2>
      </div>

      <div
        className="
          mt-8 sm:mx-auto sm:w-full sm:max-w-md
          rounded-2xl border bg-white p-6 shadow
          /* 다크: 글래스 카드 */
          dark:bg-[rgba(12,18,28,0.70)] dark:border-white/10 dark:text-slate-100
        "
      >
        <form className="space-y-6" action={formAction}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />

          {mode === 'signup' && (
            <div>
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  First Name
                </Label>
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Last Name
                </Label>
              </div>

              <div className="flex gap-4 mt-1">
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  defaultValue={state.first_name}
                  required
                  maxLength={50}
                  placeholder="Enter your First Name"
                />
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  defaultValue={state.last_name}
                  required
                  maxLength={50}
                  placeholder="Enter your Last Name"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Email
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              Password
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                defaultValue={state.password}
                required
                minLength={8}
                maxLength={100}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                Confirm Password
              </Label>
              <div className="mt-1">
                <Input
                  id="confirm-password"
                  name="confirm password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}

          {state?.error && (
            <div className="text-red-500 dark:text-rose-300 text-sm">{state.error}</div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full rounded-full font-medium"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Button>
          </div>
        </form>

        {mode === 'signin' && (
          <>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgot(v => !v)}
                className="text-sm text-orange-600 hover:text-orange-700 dark:text-[#6ad0ff] dark:hover:text-[#89dcff]"
              >
                {showForgot ? 'Hide password reset' : 'Forgot your password?'}
              </button>
            </div>
            {showForgot && <ForgotPasswordInline />}
          </>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500 dark:bg-transparent dark:text-slate-400">
                {mode === 'signin' ? 'New to our platform?' : 'Already have an account?'}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${redirect ? `?redirect=${redirect}` : ''}${priceId ? `&priceId=${priceId}` : ''}`}
              className="
                w-full flex justify-center py-2 px-4 rounded-full shadow-sm text-sm font-medium
                text-gray-700 bg-white border border-gray-300 hover:bg-gray-50
                focus-visible:outline-none focus-visible:ring-[0.5px] focus-visible:ring-orange-400 focus-visible:border-orange-400
                dark:bg-[rgba(106,208,255,0.10)]
                dark:text-[#6ad0ff]
                dark:border dark:border-[rgba(85,182,255,0.30)]
                dark:hover:bg-[rgba(85,182,255,0.25)]
                dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]
                dark:focus-visible:ring-[rgba(85,182,255,0.45)]
                dark:focus-visible:border-[rgba(85,182,255,0.45)]
              "
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in to existing account'}
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
