"use client";

import { useMemo, useState } from "react";
import {
    MaterialReactTable,
    type MRT_ColumnDef,
    type MRT_Row,
    useMaterialReactTable,
} from "material-react-table";
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Tooltip,
    Switch,
    Snackbar,
    Alert,
} from "@mui/material";
import useSWR, { mutate } from "swr";
import { EditIcon } from "lucide-react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import build from "next/dist/build";
import CopyableFileCell from "../ui/CopyableFileCell";

import { useSnackbar } from "@/components/ui/providers/SnackbarContext";

type Bookie = {
    id: string,
    bookieName: string,
    botVersion: string,
    botFileUrl: string,
    fileSizeMB: string,
    releaseNote: string,
    uploadedAt: string | null,
    isActive: boolean,
};

//fetcher: SWR 공용 fetch 함수
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BotTable({ isAdmin = false }: any) {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});
    const [editedBookie, setEditedBookie] = useState<Record<string, Bookie>>({});

    const [isCreating, setIsCreating] = useState(false);

    const {
        data: bookies = [],
        isLoading,
        error,
    } = useSWR<Bookie[]>("/api/bookie", fetcher, { revalidateOnFocus: false });

    const { showSnackbar } = useSnackbar();

    // Refresh
    const [isRefreshing, setIsRefreshing] = useState(false);

    async function handleReload() {
        try {
            setIsRefreshing(true);
            await mutate("/api/bookie"); // SWR 강제 재검증
            showSnackbar('Data refreshed', 'info');
        } finally {
            setIsRefreshing(false);
        }
    }

    const columns = useMemo<MRT_ColumnDef<Bookie>[]>(
        () => [
            {
                header: "No",
                accessorKey: "id",
                Cell: ({ row, table }) =>
                    row.index + 1,
                size: 60,
                enableEditing: false,
            },
            {
                accessorKey: "bookieName",
                header: "Bookie Name",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !e.currentTarget.value ? "Required" : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedBookie({ ...editedBookie, [row.id]: row.original });
                    },
                }),
            },
            {
                accessorKey: "botVersion",
                header: "Bot Version",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !e.currentTarget.value ? "Required" : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedBookie({ ...editedBookie, [row.id]: row.original });
                    },
                }),
            },
            {
                accessorKey: "botFileUrl",
                header: isAdmin ? "File Path" : "File",
                Cell: ({ cell, row }) => {
                    const url = cell.getValue<string | null>() ?? "";
                    const bookie = row.original.bookieName as string | undefined;
                    const ver = row.original.botVersion as string | undefined;

                    // 확장자는 실제 파일 URL에서만 추출 (예: ".exe")
                    const ext = (url.match(/\.([a-z0-9]+)$/i)?.[0]) || "";

                    // 유저 표시명: "<Bookie>Bot-<Version><ext>"
                    const pretty = bookie && ver ? `${bookie}Bot-${ver}${ext}` : undefined;

                    return (
                        <CopyableFileCell
                            url={url}
                            isAdmin={isAdmin}
                            label={isAdmin ? undefined : (pretty || (url.split("/").pop() || "Download"))}
                        />
                    );
                },
                enableEditing: false,
            },
            {
                accessorKey: "uploadedAt",
                header: "Uploaded At",
                Cell: ({ cell }) => {
                    const value = cell.getValue<string | null>();
                    if (!value) return <span>—</span>;

                    const date = new Date(value);
                    const formatted = date.toLocaleString();

                    return <span>{formatted}</span>;
                },
                enableEditing: false, // 편집 불가
                size: 160,
            },

        ],
        [bookies, editedBookie, validationErrors, isAdmin]
    );

    const renderFilterToolbar = () => (
        <Box sx={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {/* Reload */}
            <Tooltip title="Reload">
                <span>
                    <IconButton onClick={handleReload} disabled={isRefreshing}>
                        {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                </span>
            </Tooltip>

            {isAdmin && (<Button variant="contained" onClick={() => table.setCreatingRow(true)}>
                Create New
            </Button>)}
        </Box>
    );

    //Material React Table 설정
    const table = useMaterialReactTable({
        columns,
        data: bookies,
        createDisplayMode: "row",
        editDisplayMode: "row",
        enableEditing: isAdmin,
        enableRowActions: isAdmin,
        positionActionsColumn: "last",
        positionCreatingRow: "bottom",
        enableRowSelection: false,      //행 선택 활성화
        enableMultiRowSelection: false, //여러 행 선택
        enableSelectAll: false,
        getRowId: (row) => row.id,

        // ── Paper (테이블 전체 껍데기) ─────────────────────────────
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

        // ── 컨테이너 (내부 스크롤) ────────────────────────────────
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

        // ── 헤더 셀 ──────────────────────────────────────────────
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

        // ── 바디 셀 ──────────────────────────────────────────────
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

        // ── 바디 행(배경/호버) ───────────────────────────────────
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

        // ── 상단 툴바 ────────────────────────────────────────────
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

        // ── 하단 툴바(페이지네이션) ──────────────────────────────
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
        //새 행 저장 (POST)
        onCreatingRowSave: async ({ values, row, table }) => {
            if (!isAdmin) {
                showSnackbar("You do not have permission to create a new bot.", "error");
                return;
            }
            setIsCreating(true);
            try {
                // row.original에 들어있는 데이터까지 병합
                const merged = { ...row.original, ...values };

                console.log("full merged:", JSON.stringify(merged, null, 2));

                // 기본 유효성 검사
                if (!merged.bookieName || !merged.botVersion) {
                    showSnackbar("Bookie name and version are required.", "error");
                    return;
                }

                // 서버로 보낼 payload
                const payload = {
                    ...merged
                };

                // API 전송
                const res = await fetch("/api/bookie", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showSnackbar(err.error || "Failed to create bot.", "error");
                    return;
                }

                await mutate("/api/bookie");
                showSnackbar("Bot created successfully!", "success");
                table.setCreatingRow(null);
            } catch (err) {
                console.error(err);
                showSnackbar("Unexpected error while creating bot.", "error");
            } finally {
                setIsCreating(false);
            }
        },

        onEditingRowSave: async ({ exitEditingMode, row, values }) => {
            if (isCreating) return;
            if (!isAdmin) {
                showSnackbar("You do not have permission to edit the bot.", "error");
                return;
            }
            if (!values) {
                showSnackbar("No data to save — possibly invalid edit state.", "error");
                return;
            }
            const { id, ...rest } = values;

            //안전하게 변환된 payload 구성
            const payload = {
                id: row.original.id,
                ...rest,
            };

            try {
                const res = await fetch("/api/bookie", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showSnackbar(err.error || "Update failed.", "error");
                    return;
                }

                await mutate("/api/bookie");
                showSnackbar("Bot updated successfully!", "success");
                exitEditingMode();
            } catch (err) {
                console.error(err);
                showSnackbar("Unexpected error occurred while saving.", "error");
            }
        },

        onEditingRowCancel: () => {
            console.log("Edit cancelled");
        },
        renderRowActions: isAdmin
            ? ({ row, table }) => (
                <Box sx={{ display: "flex", gap: "0.5rem" }}>
                    <Tooltip title="Edit">
                        <IconButton onClick={() => table.setEditingRow(row)}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    {/* 새 Upload 버튼 */}
                    <Tooltip title="Upload File">
                        <IconButton
                            component="label"
                            color="primary"
                            sx={{ cursor: "pointer" }}
                        >
                            <CloudUploadIcon />
                            <input
                                type="file"
                                hidden
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const formData = new FormData();
                                    formData.append("file", file);
                                    formData.append("bookieId", row.original.id); // bookieId 포함

                                    try {
                                        const res = await fetch("/api/upload", {
                                            method: "POST",
                                            body: formData,
                                        });

                                        const data = await res.json();
                                        if (!res.ok) {
                                            showSnackbar(data.error || "Upload failed", "error");
                                            return;
                                        }

                                        await mutate("/api/bookie");
                                        showSnackbar("File uploaded successfully!", "success");
                                    } catch (err) {
                                        console.error(err);
                                        showSnackbar("Unexpected upload error", "error");
                                    }
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="IsAutoUpdate">
                        <Switch
                            checked={row.original.isActive}
                            onChange={async (e) => {
                                await fetch("/api/bookie", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ id: row.original.id, isActive: e.target.checked }),
                                });
                                await mutate("/api/bookie");
                                showSnackbar("AutoUpdating Station changed successfully!", "warning");
                            }}
                        />
                    </Tooltip>
                </Box>
            )
            : undefined,
        renderTopToolbarCustomActions: renderFilterToolbar,

        state: {
            isLoading,
            showAlertBanner: !!error,
            showProgressBars: isRefreshing,
        },
    });

    return (
        <>
            <MaterialReactTable table={table} />
        </>
    );
}

const validateEmail = (email: string) =>
    !!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
