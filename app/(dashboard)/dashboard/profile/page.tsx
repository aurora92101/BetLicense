'use client';

import * as React from 'react';
import { Suspense } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, SaveIcon, Trash2 } from 'lucide-react';

import { updateAccount, updatePassword, deleteAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';

// ── shared
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type AccountState = {
    first_name?: string;
    last_name?: string;
    error?: string;
    success?: string;
};

type PasswordState = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    error?: string;
    success?: string;
};

type DeleteState = {
    password?: string;
    error?: string;
    success?: string;
};

// ── Account form (from General Settings)
type AccountFormProps = {
    state: AccountState;
    first_nameValue?: string;
    last_nameValue?: string;
    emailValue?: string;
};

function AccountForm({
    state,
    first_nameValue = '',
    last_nameValue = '',
    emailValue = '',
}: AccountFormProps) {
    return (
        <>
            <div>
                <Label htmlFor="first_name" className="mb-2">
                    First Name
                </Label>
                <Input
                    id="first_name"
                    name="first_name"
                    placeholder="Enter your first name"
                    defaultValue={state.first_name || first_nameValue}
                    required
                />
            </div>

            <div>
                <Label htmlFor="last_name" className="mb-2">
                    Last Name
                </Label>
                <Input
                    id="last_name"
                    name="last_name"
                    placeholder="Enter your last name"
                    defaultValue={state.last_name || last_nameValue}
                    required
                />
            </div>

            <div>
                <Label htmlFor="email" className="mb-2">
                    Email
                </Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    defaultValue={emailValue}
                    required
                    readOnly
                    className="cursor-not-allowed opacity-80"
                    title="This field cannot be edited"
                />
            </div>
        </>
    );
}

function AccountFormWithData({ state }: { state: AccountState }) {
    const { data: user } = useSWR<User>('/api/user', fetcher);
    return (
        <AccountForm
            state={state}
            first_nameValue={user?.first_name ?? ''}
            last_nameValue={user?.last_name ?? ''}
            emailValue={user?.email ?? ''}
        />
    );
}

// ── Profile Page (merged)
export default function ProfilePage() {
    // Account info update
    const [accountState, accountAction, isAccountPending] = useActionState<AccountState, FormData>(
        updateAccount,
        {}
    );

    // Password update
    const [passwordState, passwordAction, isPasswordPending] = useActionState<PasswordState, FormData>(
        updatePassword,
        {}
    );

    // Delete account
    const [deleteState, deleteAction, isDeletePending] = useActionState<DeleteState, FormData>(
        deleteAccount,
        {}
    );

    const { mutate } = useSWRConfig();

    React.useEffect(() => {
        if (accountState?.success || passwordState?.success || deleteState?.success) {
            mutate('/api/user', undefined, { revalidate: true });
        }
    }, [accountState, mutate]);
    return (
        <section className="flex-1 p-4 lg:p-8">
            <h1 className="text-lg lg:text-2xl font-medium text-gray-900 dark:text-slate-100 mb-6">
                User Profile
            </h1>

            {/* Top row: two cards side-by-side on lg+ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Account Information (left, 1/2) */}
                <Card className="lg:col-span-6">
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" action={accountAction}>
                            <Suspense fallback={<AccountForm state={accountState} />}>
                                <AccountFormWithData state={accountState} />
                            </Suspense>

                            {accountState.error && (
                                <p className="text-red-500 dark:text-rose-300 text-sm">{accountState.error}</p>
                            )}
                            {accountState.success && (
                                <p className="text-green-600 dark:text-emerald-300 text-sm">
                                    {accountState.success}
                                </p>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="rounded-full"
                                disabled={isAccountPending}
                            >
                                {isAccountPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Password (right, 1/2) */}
                <Card className="lg:col-span-6">
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" action={passwordAction}>
                            <div>
                                <Label htmlFor="current-password" className="mb-2">
                                    Current Password
                                </Label>
                                <Input
                                    id="current-password"
                                    name="currentPassword"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    defaultValue={passwordState.currentPassword}
                                />
                            </div>

                            <div>
                                <Label htmlFor="new-password" className="mb-2">
                                    New Password
                                </Label>
                                <Input
                                    id="new-password"
                                    name="newPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    defaultValue={passwordState.newPassword}
                                />
                            </div>

                            <div>
                                <Label htmlFor="confirm-password" className="mb-2">
                                    Confirm New Password
                                </Label>
                                <Input
                                    id="confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    defaultValue={passwordState.confirmPassword}
                                />
                            </div>

                            {passwordState.error && (
                                <p className="text-red-500 dark:text-rose-300 text-sm">{passwordState.error}</p>
                            )}
                            {passwordState.success && (
                                <p className="text-green-600 dark:text-emerald-300 text-sm">
                                    {passwordState.success}
                                </p>
                            )}

                            <Button type="submit" size="lg" className="rounded-full" disabled={isPasswordPending}>
                                {isPasswordPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Update Password
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom row: Delete Account (full width) */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Delete Account</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                        Account deletion is non-reversible. Please proceed with caution.
                    </p>
                    <form action={deleteAction} className="space-y-4">
                        <div>
                            <Label htmlFor="delete-password" className="mb-2">
                                Confirm Password
                            </Label>
                            <Input
                                id="delete-password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                maxLength={100}
                                defaultValue={deleteState.password}
                            />
                        </div>

                        {deleteState.error && (
                            <p className="text-red-500 dark:text-rose-300 text-sm">{deleteState.error}</p>
                        )}

                        <Button
                            type="submit"
                            variant="destructive"
                            size="lg"
                            className="rounded-full"
                            disabled={isDeletePending}
                        >
                            {isDeletePending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Account
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}
