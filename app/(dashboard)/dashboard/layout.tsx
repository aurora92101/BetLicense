// app/(dashboard)/layout.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Users, KeyRound, LaptopMinimalCheck,
    Bell, Mail, LogOut, User as UserIcon, Presentation, HomeIcon,
    PanelRight, PanelLeft, MessageSquare,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/providers/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useSWR, { mutate } from 'swr';
import { User } from '@/lib/db/schema';
import { signOut } from '@/app/(login)/actions';
import BetfriendLogo from '@/components/brand/BetfriendLogo';

import SmartLink from '@/components/ui/SmartLink';
import { useRouteLoading } from '@/components/ui/providers/RouteLoadingProvider';

// 별칭 드롭다운(알림)
import {
    DropdownMenu as DD, DropdownMenuContent as DDC,
    DropdownMenuTrigger as DDT, DropdownMenuLabel as DDL, DropdownMenuSeparator as DDS
} from '@/components/ui/dropdown-menu';

import { useAutoLogout } from '@/app/hooks/useAutoLogout';
import { SESSION_TTL_MS } from '@/lib/auth/session-constants';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    useAutoLogout({ idleMs: SESSION_TTL_MS });
    const pathname = usePathname();
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(false);

    const fetcher = (url: string) => fetch(url).then((res) => res.json());
    const swrFetcher = async (url: string) => {
        const r = await fetch(url, { credentials: 'include' });
        if (r.status === 401 || r.status === 403) {
            if (typeof window !== 'undefined') window.location.href = '/sign-in';
            const e: any = new Error('Unauthenticated'); e.status = r.status; throw e;
        }
        if (!r.ok) throw new Error('Request failed');
        return r.json();
    };

    const { data: user } = useSWR<User>('/api/user', fetcher);
    const { start, visible } = useRouteLoading();

    const { data: myRoom } = useSWR<{ pid: string }>(
        user && user.role == 'owner' ? '/api/rooms/me' : null, swrFetcher, { shouldRetryOnError: false },
    );

    const { data: userRoomUnread } = useSWR<{
        pid: string | null;
        unread: number;
        hasUnread: boolean;
        lastReadAt: string | null;
        lastAdminMessageAt: string | null;
        lastSnippet: string | null;
    }>(
        user && user.role == 'owner' ? '/api/rooms/me/unread' : null,
        swrFetcher,
        { refreshInterval: 10000 }
    );

    const shortLabel = (label: string) => {
        const map: Record<string, string> = {
            General: 'Gen', License: 'Lic', Bot: 'Bot', Team: 'Team', Activity: 'Act', Security: 'Sec',
            'User Manage': 'Users', 'License Key Manage': 'Keys', 'Bot Manage': 'Bot', 'Landing Manage': 'Land',
        };
        return map[label] ?? (label.length > 5 ? label.slice(0, 5) : label);
    };

    interface NavItem { href: string; icon: any; label: string; badge?: number; }
    const { data: u } = { data: user };

    const navItems = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [
            { href: '/dashboard/license', icon: KeyRound, label: 'License' },
            { href: '/dashboard/bot', icon: LaptopMinimalCheck, label: 'Bot' },
        ];
        if (u && u.role === 'owner') {
            items.push({
                href: '/dashboard/rooms',
                icon: MessageSquare,
                label: 'Chat Room',
                badge: typeof userRoomUnread?.unread === 'number' ? userRoomUnread.unread : 0,
            });
        }
        return items;
    }, [u?.role, userRoomUnread?.unread]);

    const adminItems = useMemo<NavItem[]>(() => ([
        { href: '/admin/user_manage', icon: Users, label: 'User Manage' },
        u?.role === 'super_admin' ? { href: '/admin/license_manage', icon: KeyRound, label: 'License Key Manage' } : null,
        { href: '/admin/bot_manage', icon: LaptopMinimalCheck, label: 'Bot Manage' },
        { href: '/admin/rooms', icon: MessageSquare, label: 'Chat Room' },
        { href: '/admin/landing_manage', icon: Presentation, label: 'Landing Manage' },
    ].filter(Boolean) as NavItem[]), [u?.role]);


    const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-64';
    const headerLeft = isCollapsed ? 'lg:left-[72px]' : 'lg:left-64';
    const mainMarginLeft = isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64';

    const userInitial = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

    async function handleSignOut() {
        start();
        await signOut();
        mutate('/api/user');
        router.push('/');
    }

    const chatUnread = userRoomUnread?.unread ?? 0;
    const chatPid = userRoomUnread?.pid ?? myRoom?.pid ?? null;

    // ===== 데스크탑 사이드바 =====
    const Sidebar = (
        <aside
            className={[
                'hidden lg:flex',
                sidebarWidth,
                'bg-white dark:bg-[rgba(15,23,42,0.85)] border-r border-gray-200 dark:border-white/10',
                'flex-col fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out',
                'backdrop-blur-0 dark:backdrop-blur-md',
                'lg:translate-x-0',
                'dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
            ].join(' ')}
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar navigation"
        >
            {/* Sidebar header */}
            <div className="h-16 flex items-center justify-between px-3 border-b border-transparent">
                {isCollapsed ? (
                    <SmartLink key="home" href="/" aria-label="Go to home" className="inline-flex">
                        <div className="relative" style={{ width: 36, height: 36 }}>
                            <Image
                                src="/images/brand/betfriend-logomark.svg"
                                alt="BetFriend"
                                fill
                                sizes="48px"
                                className="object-contain"
                                priority
                            />
                        </div>
                    </SmartLink>
                ) : (
                    <BetfriendLogo
                        width={220}
                        className="text-gray-900 dark:text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,.25))]"
                    />
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-2 dark:[&::-webkit-scrollbar]:w-1.5 dark:[&::-webkit-scrollbar-thumb]:rounded dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
                {!isCollapsed && ((user?.role === 'admin') || (user?.role === 'super_admin')) && (
                    <p className="px-3 text-xs font-semibold text-gray-400 uppercase mt-4">General</p>
                )}

                {navItems.map((item) => {
                    const active =
                        item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <div key={item.href} className={isCollapsed ? 'flex flex-col items-center' : undefined}>
                            <SmartLink href={item.href} title={item.label} className={isCollapsed ? 'w-full flex justify-center' : undefined}>
                                <Button
                                    variant={active ? 'secondary' : 'ghost'}
                                    className={[
                                        'w-full',
                                        isCollapsed ? 'justify-center px-0 py-2' : 'justify-start',
                                        isCollapsed ? '[&>svg]:!h-8 [&>svg]:!w-8' : '[&>svg]:!h-6 [&>svg]:!w-6',
                                        active
                                            ? 'bg-blue-100 text-blue-600 dark:bg-[rgba(106,208,255,0.18)] dark:text-[#6ad0ff] dark:border dark:border-[rgba(85,182,255,0.45)]'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/5',
                                    ].join(' ')}
                                >
                                    <item.icon className={isCollapsed ? '' : 'mr-2'} />
                                    {!isCollapsed && (
                                        <span className="flex items-center gap-2">
                                            {item.label}
                                            {typeof (item as any).badge === 'number' && (item as any).badge > 0 && (
                                                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                          text-[10px] font-semibold rounded-full
                          bg-blue-600 text-white dark:bg-[#6ad0ff] dark:text-slate-900">
                                                    {(item as any).badge > 99 ? '99+' : (item as any).badge}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </Button>
                            </SmartLink>

                            {isCollapsed && (
                                <span className="mt-1 text-[10px] leading-none text-gray-500 dark:text-slate-400 max-w-[56px] truncate text-center">
                                    {shortLabel(item.label)}
                                </span>
                            )}
                        </div>
                    );
                })}

                {((user?.role === 'admin') || (user?.role === 'super_admin')) && (
                    <>
                        {!isCollapsed && (
                            <p className="px-3 text-xs font-semibold text-gray-400 uppercase mt-2">Admin</p>
                        )}
                        {adminItems.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <div key={item.href} className={isCollapsed ? 'flex flex-col items-center' : undefined}>
                                    <SmartLink href={item.href} title={item.label} className={isCollapsed ? 'w-full flex justify-center' : undefined}>
                                        <Button
                                            variant={active ? 'secondary' : 'ghost'}
                                            className={[
                                                'w-full',
                                                isCollapsed ? 'justify-center px-0 py-2' : 'justify-start',
                                                isCollapsed ? '[&>svg]:!h-8 [&>svg]:!w-8' : '[&>svg]:!h-6 [&>svg]:!w-6',
                                                active
                                                    ? 'bg-blue-100 text-blue-600 dark:bg-[rgba(106,208,255,0.18)] dark:text-[#6ad0ff] dark:border dark:border-[rgba(85,182,255,0.45)]'
                                                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/5',
                                            ].join(' ')}
                                        >
                                            <item.icon className={isCollapsed ? '' : 'mr-2'} />
                                            {!isCollapsed && item.label}
                                        </Button>
                                    </SmartLink>
                                    {isCollapsed && (
                                        <span className="mt-1 text-[10px] leading-none text-gray-500 dark:text-slate-400 max-w-[56px] truncate text-center">
                                            {shortLabel(item.label)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </nav>

            {/* 사이드바 하단 프로필 */}
            <div className="p-3 pt-2">
                <SmartLink
                    href="/dashboard/profile"
                    aria-label="Edit profile"
                    className={[
                        'group flex w-full items-center',
                        isCollapsed ? 'justify-center' : 'justify-start gap-3',
                        'rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors',
                        'p-2',
                    ].join(' ')}
                >
                    <Avatar className="size-9 border border-gray-300 dark:border-white/15">
                        <AvatarImage src="/images/user-avatar.png" alt="User" />
                        <AvatarFallback className="text-sm">{userInitial}</AvatarFallback>
                    </Avatar>

                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {user?.first_name ?? 'User'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
                                {user?.email ?? ''}
                            </span>
                        </div>
                    )}
                </SmartLink>
            </div>
        </aside>
    );

    // ===== 모바일 수평 내비바 =====
    const MobileNav = (
        <div
            className={[
                'lg:hidden sticky z-10',
                'bg-white/85 dark:bg-[rgba(15,23,42,0.85)] backdrop-blur border-b',
                'border-gray-200 dark:border-white/10',
            ].join(' ')}
            // 헤더 높이(56px) + safe area 만큼 아래에서 고정
            style={{ top: 'calc(56px + env(safe-area-inset-top))' }}
        >
            {/* 일반 섹션 */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-2 py-2">
                {navItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <SmartLink key={item.href} href={item.href} className="shrink-0">
                            <Button
                                variant={active ? 'secondary' : 'ghost'}
                                size="sm"
                                className={[
                                    'rounded-full px-3 h-8',
                                    'border border-transparent',
                                    active
                                        ? 'bg-blue-100 text-blue-600 dark:bg-[rgba(106,208,255,0.18)] dark:text-[#6ad0ff] dark:border-[rgba(85,182,255,0.45)]'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10',
                                ].join(' ')}
                            >
                                <item.icon className="h-4 w-4 mr-1.5" />
                                <span className="text-sm">{shortLabel(item.label)}</span>
                                {typeof item.badge === 'number' && item.badge > 0 && (
                                    <span className="ml-1 inline-flex min-w-[16px] h-[16px] px-1 items-center justify-center text-[10px] rounded-full bg-blue-600 text-white dark:bg-[#6ad0ff] dark:text-slate-900">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Button>
                        </SmartLink>
                    );
                })}
            </div>

            {/* 어드민 섹션 */}
            {((user?.role === 'admin') || (user?.role === 'super_admin')) && (
                <>
                    <div className="px-3 pb-1 pt-0.5 text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Admin
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-2 pb-2">
                        {adminItems.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <SmartLink key={item.href} href={item.href} className="shrink-0">
                                    <Button
                                        variant={active ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className={[
                                            'rounded-full px-3 h-8',
                                            'border border-transparent',
                                            active
                                                ? 'bg-blue-100 text-blue-600 dark:bg-[rgba(106,208,255,0.18)] dark:text-[#6ad0ff] dark:border-[rgba(85,182,255,0.45)]'
                                                : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-white/10',
                                        ].join(' ')}
                                    >
                                        <item.icon className="h-4 w-4 mr-1.5" />
                                        <span className="text-sm">{shortLabel(item.label)}</span>
                                    </Button>
                                </SmartLink>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar (데스크탑 전용) */}
            {Sidebar}

            {/* Main + Header */}
            <div className={['flex-1 flex flex-col ml-0 transition-all duration-300 overflow-hidden', mainMarginLeft].join(' ')}>
                <header
                    className={[
                        'fixed top-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4', // ⬅️ left-0 추가
                        headerLeft, // lg에서만 left-64 / left-[72px]로 오버라이드
                        'bg-white border-b border-gray-200',
                        'dark:bg-[rgba(22,30,46,0.85)] dark:border-white/10 dark:backdrop-blur',
                        'z-20',
                        'h-[calc(56px+env(safe-area-inset-top))]',
                    ].join(' ')}
                    style={{
                        paddingTop: 'env(safe-area-inset-top)',
                        // (선택) 아이폰 노치 대응: 좌우 세이프 에어리어도 반영하고 싶으면 아래 두 줄 추가
                        // paddingLeft: 'env(safe-area-inset-left)',
                        // paddingRight: 'env(safe-area-inset-right)',
                    }}
                >
                    <div className="flex items-center gap-1">
                        {/* 데스크탑: 접힘 토글 */}
                        <button
                            aria-label="Collapse sidebar"
                            onClick={() => setIsCollapsed((v) => !v)}
                            className={[
                                'hidden lg:inline-flex items-center justify-center',
                                'h-10 w-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                                'text-gray-700 hover:bg-gray-100',
                                'dark:text-slate-200 dark:hover:bg-white/10',
                                'transition-colors',
                            ].join(' ')}
                        >
                            {isCollapsed ? <PanelRight className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
                        </button>

                        {/* 모바일에선 비워두기 */}
                        <div className="lg:hidden w-10 h-10" aria-hidden />
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.role === 'owner' && (
                            <DD>
                                <DDT asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="relative dark:text-slate-200"
                                        aria-label="Chat notifications"
                                    >
                                        <Bell className="h-5 w-5" />
                                        {chatUnread > 0 && (
                                            <span
                                                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[3px]
                          rounded-full bg-red-500 text-white text-[10px] font-semibold
                          flex items-center justify-center leading-none shadow-sm"
                                                aria-label={`${chatUnread > 99 ? '99+' : chatUnread} unread`}
                                            >
                                                {chatUnread > 99 ? '99+' : chatUnread}
                                            </span>
                                        )}
                                    </Button>
                                </DDT>

                                <DDC
                                    align="end"
                                    className="w-80 border border-black/10 bg-white/85 backdrop-blur
                    dark:bg-[rgba(15,23,42,0.95)] dark:text-slate-100 dark:border-white/10"
                                >
                                    <DDL className="text-xs font-semibold text-gray-700 dark:text-slate-200">Chat updates</DDL>
                                    <DDS />

                                    {
                                        chatUnread === 0 ?
                                            (
                                                <div className="p-3 text-sm text-gray-500 dark:text-slate-400">
                                                    All caught up!
                                                </div>
                                            ) :
                                            (
                                                <div className="p-3 space-y-2">
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                                        Unread from admin:
                                                        <b>{chatUnread}</b>
                                                    </div>
                                                    {userRoomUnread?.lastSnippet &&
                                                        (
                                                            <div className="text-sm line-clamp-3">
                                                                {userRoomUnread.lastSnippet}
                                                            </div>
                                                        )
                                                    }
                                                    {userRoomUnread?.lastAdminMessageAt &&
                                                        (
                                                            <div className="text-[11px] text-gray-500 dark:text-slate-400">
                                                                Last msg at:
                                                                {new Date(userRoomUnread.lastAdminMessageAt).toLocaleString()}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            )
                                    }
                                    <DDS />
                                    <div className="p-2 text-right">
                                        <Button variant="ghost" size="sm"
                                            onClick={
                                                () => {
                                                    start();
                                                    if (chatPid) router.push(`/dashboard/rooms/k/${encodeURIComponent(chatPid)}`);
                                                    else router.push('/dashboard/rooms');
                                                }
                                            }
                                        >
                                            Go to chat
                                        </Button>
                                    </div>
                                </DDC>
                            </DD>
                        )}

                        <Button variant="ghost" size="icon" className="dark:text-slate-200">
                            <Mail className="h-5 w-5" />
                        </Button>
                        <ThemeToggle />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="cursor-pointer size-8 border border-gray-300 dark:border-white/15">
                                    <AvatarImage src="/images/user-avatar.png" alt="User" />
                                    <AvatarFallback>{userInitial}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-56 dark:bg-[rgba(15,23,42,0.95)] dark:text-slate-100 dark:border-white/10 dark:backdrop-blur"
                            >
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{user?.first_name ?? 'User'}</span>
                                        <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                            {user?.email ?? ''}
                                        </span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { start(); router.push('/'); }}>
                                    <HomeIcon className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { start(); router.push('/dashboard/profile'); }}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* 로딩 바 */}
                    <div
                        className={`pointer-events-none absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <span
                            className="block h-full w-[100%] bg-blue-500/70 dark:bg-[rgba(106,208,255,0.9)] origin-left anim-routebar"
                            style={{
                                animation: 'routeBar 1.1s ease-in-out infinite',
                                maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
                            }}
                        />
                    </div>
                </header>

                {/* 모바일 전용: 헤더 높이만큼 스페이서 (헤더 fixed 가림 방지) */}
                <div className="lg:hidden" style={{ height: 'calc(56px + env(safe-area-inset-top))' }} />

                {/* 모바일 수평 내비(헤더 아래) */}
                {MobileNav}

                {/* Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden pt-2 lg:pt-14 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="hidden lg:block h-0" aria-hidden />
                    {children}
                </main>
            </div>
        </div>
    );
}

/* Tailwind 유틸: 모바일 스크롤바 숨김 */
// 전역 CSS에 아래 유틸 추가:
// .no-scrollbar::-webkit-scrollbar { display: none; }
// .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
