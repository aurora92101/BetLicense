"use client";

import { useMemo, useState } from "react";
import {
    MaterialReactTable,
    useMaterialReactTable,
    type MRT_ColumnDef,
} from "material-react-table";
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Alert,
    Typography,
    useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import useSWR, { mutate } from "swr";
import ModalPayment from "@/components/ModalPayment";
import { customerPortalAction } from "@/lib/payments/actions";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { Badge } from "@/components/ui/Badge";
import { ShoppingCart } from "lucide-react";

type LicenseKey = {
    id: string;
    userId: string;
    userEmail: string;
    bookieName: string;
    keyName: string;
    introducerEmail: string;
    purchaseRoute: string;
    usePeriod: number;
    price: number;
    startTime: string | null;
    endTime: string | null;
    isBlocked: boolean;
    isRunning: boolean;
};

type User = {
    id: string;
    email: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LicenseUserTable({ user }: { user: User }) {
    // 필터 상태
    const [filterStatus, setFilterStatus] =
        useState<"All" | "Live" | "Expired" | "Blocked">("Live");
    const [filterSubStatus, setFilterSubStatus] =
        useState<"Running" | "Closed" | "All">("Running");

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [open, setOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error" | "info" | "warning",
    });

    const showSnackbar = (message: string, severity: any = "success") =>
        setSnackbar({ open: true, message, severity });

    // API URL 구성
    const buildApiUrl = () => {
        const base = `/api/license_key?userId=${user.id}`;
        const params = new URLSearchParams();

        if (filterStatus === "All") return base;
        if (filterStatus === "Live") {
            params.set("isBlocked", "false");
            params.set("endAfterNow", "true");
            if (filterSubStatus === "Running") params.set("isRunning", "true");
            else if (filterSubStatus === "Closed") params.set("isRunning", "false");
        } else if (filterStatus === "Expired") {
            params.set("isBlocked", "false");
            params.set("endAfterNow", "false");
        } else if (filterStatus === "Blocked") {
            params.set("isBlocked", "true");
        }

        return `${base}&${params.toString()}`;
    };

    // 데이터 fetch
    const { data: licenseKey = [], isLoading, error } = useSWR<LicenseKey[]>(
        buildApiUrl(),
        fetcher,
        { revalidateOnFocus: false }
    );

    // 새로고침
    async function handleReload() {
        try {
            setIsRefreshing(true);
            await mutate(buildApiUrl());
            showSnackbar("Data refreshed", "info");
        } finally {
            setIsRefreshing(false);
        }
    }

    // 테이블 컬럼 정의 (모두 읽기 전용)
    const columns = useMemo<MRT_ColumnDef<LicenseKey>[]>(
        () => [
            {
                header: "No",
                accessorKey: "id",
                Cell: ({ row, table }) =>
                    row.index + 1,
                size: 60,
            },
            // { accessorKey: "userEmail", header: "User Email" },
            { accessorKey: "bookieName", header: "Bookie Name" },
            {
                accessorKey: "keyName",
                header: "Key Name",
                size: 320,        // 원하는 기본 너비(px)
                minSize: 260,     // 최소
                maxSize: 640,     // 최대 (리사이즈 허용 시 한계)
                enableResizing: true,
                Cell: ({ cell }) => {
                    const value = cell.getValue<string | null>();
                    const [copied, setCopied] = useState(false);
                    const theme = useTheme(); // import { useTheme } from '@mui/material';

                    const baseColor =
                        theme.palette.mode === 'dark' ? '#6ad0ff' : '#1976d2';
                    const copiedColor =
                        theme.palette.mode === 'dark' ? '#2ddb36' : '#2e7d32';

                    const handleCopy = async () => {
                        if (!value) return;
                        try {
                            await navigator.clipboard.writeText(value);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        } catch (err) {
                            console.error('Clipboard copy failed:', err);
                        }
                    };

                    return (
                        <Tooltip title={copied ? 'Copied!' : 'Click to copy'} placement="top">
                            <Box
                                onClick={handleCopy}
                                sx={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: copied ? copiedColor : baseColor,
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span>{value ?? '—'}</span>
                                {copied ? <CheckIcon fontSize="small" sx={{ opacity: 0.85 }} /> : <ContentCopyIcon fontSize="small" sx={{ opacity: 0.75 }} />}
                            </Box>
                        </Tooltip>
                    );
                },
                enableEditing: false,
            },
            {
                accessorKey: "usePeriod",
                header: "Use Period",
                Cell: ({ cell }) => {
                    const value = cell.getValue() as number; // 명시적 캐스팅
                    return <Typography>{value} month(s)</Typography>;
                }
            },
            {
                accessorKey: "startTime",
                header: "Start Time",
                Cell: ({ cell }) =>
                    cell.getValue()
                        ? new Date(cell.getValue() as string).toLocaleString()
                        : "—",
            },
            {
                accessorKey: "endTime",
                header: "End Time",
                Cell: ({ cell }) =>
                    cell.getValue()
                        ? new Date(cell.getValue() as string).toLocaleString()
                        : "—",
            },
            {
                accessorKey: "isRunning",
                header: "Status",
                Cell: ({ cell }) => {
                    const value = cell.getValue() as boolean;

                    // 기존 글자색 유지
                    const textColor = value ? "#2ddb36ff" : "#ef5350";

                    return (
                        <span style={{ color: textColor }}>
                            <Badge label={value ? "Running" : "Closed"} />
                        </span>
                    );
                },
            },
            {
                accessorKey: "isBlocked",
                header: "Access",
                Cell: ({ cell, row }) => {
                    const value = cell.getValue() as boolean;
                    const endTime = row.original.endTime ? new Date(row.original.endTime) : null;
                    const now = new Date();

                    let label = value ? "Blocked" : "Active";
                    let textColor = value ? "#ef5350" : "#2ddb36ff";

                    if (!value && endTime) {
                        const diffMs = endTime.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        if (diffDays > 0) label = `Active (${diffDays} day${diffDays > 1 ? "s" : ""} left)`;
                        else if (diffDays === 0) label = "Active (ends today)";
                        else { label = "Active (expired)"; textColor = "#ef5350"; }
                    }

                    return (
                        <span style={{ color: textColor }}>
                            <Badge label={label} />
                        </span>
                    );
                },
            },
        ],
        []
    );

    // MaterialReactTable 설정
    const table = useMaterialReactTable({
        columns,
        data: licenseKey,
        enableEditing: false,
        enableRowSelection: false,
        enableColumnOrdering: false,
        enableSorting: true,
        enableFilters: false,
        muiTablePaperProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        '& .MuiTable-root': {
                            backgroundColor: 'rgba(15, 23, 42, 0.88)',
                            backdropFilter: 'blur(10px)',
                        },
                    }
                    : null,
        },

        muiTableContainerProps: {
            sx: (theme) => ({
                maxHeight: 'calc(100vh - 220px)',
                overflowY: 'auto',
                ...(theme.palette.mode === 'dark' && {
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '3px',
                    },
                }),
            }),
        },

        muiTableHeadCellProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        color: '#f8fafc',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        borderBottom: '1px solid rgba(255,255,255,0.15)',
                    }
                    : null,
        },

        muiTableBodyCellProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        color: '#e2e8f0',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.92rem',
                    }
                    : null,
        },

        muiTableBodyRowProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(22, 30, 46, 0.85)',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            transition: 'background-color 0.2s ease',
                        },
                    }
                    : null,
        },

        muiTopToolbarProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(22, 30, 46, 0.92)',
                        backdropFilter: 'blur(8px)',
                        borderBottom: '1px solid rgba(255,255,255,0.12)',
                        '& .MuiButton-root': { borderRadius: 8, textTransform: 'none' },
                        '& .MuiButton-contained': {
                            backgroundColor: 'rgba(85,182,255,0.2)',
                            color: '#6ad0ff',
                            border: '1px solid rgba(85,182,255,0.5)',
                            '&:hover': { backgroundColor: 'rgba(85,182,255,0.5)' },
                        },
                        '& .MuiButton-outlined': {
                            color: '#6ad0ff',
                            borderColor: 'rgba(106, 208, 255, 0.4)',
                            '&:hover': {
                                borderColor: 'rgba(106, 208, 255, 0.7)',
                                background: 'rgba(106,208,255,0.08)',
                            },
                        },
                        '& .MuiIconButton-root': {
                            color: '#e2eefb',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                        },
                        '& .MuiInputBase-root': {
                            backgroundColor: 'rgba(12,18,28,0.7)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8,
                            color: '#E5F0FF',
                            '& .MuiSvgIcon-root': { color: '#b9d6ff' },
                        },
                    }
                    : null,
        },

        muiBottomToolbarProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(22, 30, 46, 0.92)',
                        backdropFilter: 'blur(8px)',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        '& .MuiInputBase-root': {
                            backgroundColor: 'rgba(12,18,28,0.7)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8,
                            color: '#E5F0FF',
                            '& .MuiSvgIcon-root': { color: '#b9d6ff' },
                        },
                        '& .MuiIconButton-root': {
                            color: '#cfe6ff',
                            '&.Mui-disabled': { color: 'rgba(207,230,255,0.35)' },
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
                        },
                        '& .MuiTypography-root, & .MuiFormLabel-root': {
                            color: 'rgba(229,240,255,0.85)',
                        },
                    }
                    : null,
        },
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {/* 새로고침 */}
                <Tooltip title="Reload">
                    <span>
                        <IconButton onClick={handleReload} disabled={isRefreshing}>
                            {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </span>
                </Tooltip>

                {/* 상태 필터 */}
                <FormControl size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        label="Status"
                        value={filterStatus}
                        onChange={(e) => {
                            const val = e.target.value as any;
                            setFilterStatus(val);
                            if (val !== "Live") setFilterSubStatus("Running");
                        }}
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value="All">All</MenuItem>
                        <MenuItem value="Live">Live</MenuItem>
                        <MenuItem value="Expired">Expired</MenuItem>
                        <MenuItem value="Blocked">Blocked</MenuItem>
                    </Select>
                </FormControl>

                {/* 서브상태 필터 */}
                <FormControl size="small" disabled={filterStatus !== "Live"}>
                    <InputLabel>Substatus</InputLabel>
                    <Select
                        label="Substatus"
                        value={filterSubStatus}
                        onChange={(e) => setFilterSubStatus(e.target.value as any)}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="All">All</MenuItem>
                        <MenuItem value="Running">Running</MenuItem>
                        <MenuItem value="Closed">Closed</MenuItem>
                    </Select>
                </FormControl>

                <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
                    <ShoppingCart className="w-4 h-4" />
                    Create New License
                </Button>

                <Button
                    variant="outlined"
                    color="info"
                    onClick={() => customerPortalAction()}
                >
                    Manage Subscription
                </Button>
            </Box>
        ),
        state: {
            isLoading,
            showAlertBanner: !!error,
            showProgressBars: isRefreshing,
        },
    });

    return (
        <>
            <MaterialReactTable table={table} />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* 결제 모달 */}
            {open && <ModalPayment onClose={() => setOpen(false)} />}
        </>
    );
}
