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
    Typography,
    Switch,
    Select,
    MenuItem,
    Snackbar,
    Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import useSWR, { mutate } from "swr";
import { EditIcon } from "lucide-react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type User = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    permission: boolean;
    role: string;
};

// fetcher: SWR 공용 fetch 함수
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function UsersTable({ isSuperAdmin = false }: any) {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});
    const [editedUsers, setEditedUsers] = useState<Record<string, User>>({});

    // READ (유저 불러오기)
    const {
        data: users = [],
        isLoading,
        error,
    } = useSWR<User[]>("/api/users", fetcher);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<User | null>(null);

    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<User[]>([]);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({ open: false, message: "", severity: "success" });

    // Refresh
    const [isRefreshing, setIsRefreshing] = useState(false);

    async function handleReload() {
        try {
            setIsRefreshing(true);
            await mutate('/api/users'); // SWR 강제 재검증
            showSnackbar('Data refreshed', 'info');
        } finally {
            setIsRefreshing(false);
        }
    }

    const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning" = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    // CREATE
    async function createUser(user: Partial<User>) {
        await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
        });
        mutate("/api/users"); // 다시 불러오기
    }

    // UPDATE
    async function updateUsers(users: User[]) {
        await fetch("/api/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(users),
        });
        mutate("/api/users");
        showSnackbar("User updated successfully!", "success");
    }

    // DELETE
    async function deleteUser(id: string) {
        await fetch(`/api/users?id=${id}`, { method: "DELETE" });
        mutate("/api/users");
        showSnackbar("User deleted successfully!", "error");
    }

    // 컬럼 정의
    const columns = useMemo<MRT_ColumnDef<User>[]>(
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
                accessorKey: "first_name",
                header: "First Name",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !e.currentTarget.value ? "Required" : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedUsers({ ...editedUsers, [row.id]: row.original });
                    },
                }),
            },
            {
                accessorKey: "last_name",
                header: "Last Name",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !e.currentTarget.value ? "Required" : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedUsers({ ...editedUsers, [row.id]: row.original });
                    },
                }),
            },
            {
                accessorKey: "email",
                header: "Email",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    type: "email",
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !validateEmail(e.currentTarget.value)
                            ? "Invalid Email"
                            : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedUsers({ ...editedUsers, [row.id]: row.original });
                    },
                }),
            },
            //   {
            //     accessorKey: "password_hash",
            //     header: "Password",
            //     muiEditTextFieldProps: ({ cell, row }) => ({
            //       required: true,
            //       error: !!validationErrors?.[cell.id],
            //       helperText: validationErrors?.[cell.id],
            //       onBlur: (e) => {
            //         const err = !e.currentTarget.value ? "Required" : undefined;
            //         setValidationErrors({ ...validationErrors, [cell.id]: err });
            //         setEditedUsers({ ...editedUsers, [row.id]: row.original });
            //       },
            //     }),
            //   },

        ],
        [editedUsers, validationErrors]
    );

    // UPDATE 저장 버튼 핸들러
    const handleSaveUsers = async () => {
        if (Object.values(validationErrors).some((err) => !!err)) return;
        await updateUsers(Object.values(editedUsers));
        setEditedUsers({});
    };

    const handleDeleteClick = (row: MRT_Row<User>) => {
        setSelectedRow(row.original);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedRow) {
            await deleteUser(selectedRow.id);
            setSelectedRow(null);
            setConfirmOpen(false);
        }
    };

    const handleCancelDelete = () => {
        setSelectedRow(null);
        setConfirmOpen(false);
    };

    const handleConfirmBulkDelete = async () => {
        for (const user of selectedRows) {
            await deleteUser(user.id);
        }
        setSelectedRows([]);
        setBulkDeleteOpen(false);
        mutate("/api/users");
    };

    // Material React Table 설정
    const table = useMaterialReactTable({
        columns,
        data: users,
        createDisplayMode: "row",
        editDisplayMode: "row",
        enableEditing: true,
        enableRowActions: true,
        positionActionsColumn: "last",
        enableRowSelection: true,      // 행 선택 활성화
        enableMultiRowSelection: true, // 여러 행 선택
        enableSelectAll: true,
        getRowId: (row) => row.id,
        // ── 테이블 외곽 (Paper)
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

        // ── 컨테이너(내부 스크롤)
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

        // ── 헤더 셀
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

        // ── 바디 셀
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

        // ── 바디 행
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

        // ── 상단 툴바
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

        // ── 하단 툴바(페이지네이션)
        muiBottomToolbarProps: {
            sx: (theme) =>
                theme.palette.mode === 'dark'
                    ? {
                        backgroundColor: 'rgba(22, 30, 46, 0.92)',
                        backdropFilter: 'blur(8px)',
                        borderTop: '1px solid rgba(255,255,255,0.12)',
                        "& .MuiFormControl-root .MuiInputBase-root": {
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
        onEditingRowSave: async ({ exitEditingMode, row, values }) => {
            const { id, ...rest } = values;
            await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: row.original.id, ...rest }),
            });
            mutate("/api/users"); // SWR 캐시 갱신
            exitEditingMode();
        },
        onEditingRowCancel: () => {
            console.log("Edit cancelled");
        },
        renderRowActions: ({ row, table }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
                <Tooltip title="Edit">
                    <IconButton onClick={() => table.setEditingRow(row)}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                    <IconButton color="error" onClick={() => handleDeleteClick(row)}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Toggle Permission">
                    <Switch
                        checked={row.original.permission}
                        onChange={async (e) => {
                            await fetch("/api/users", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: row.original.id, permission: e.target.checked }),
                            });
                            mutate("/api/users"); // SWR 캐시 갱신
                            showSnackbar("User permission changed successfully!", "warning");
                        }}
                    />
                </Tooltip>
                {/* Role Select */}
                {isSuperAdmin && (<Tooltip title="">
                    <Select
                        size="small"
                        value={row.original.role}
                        onChange={async (e) => {
                            await fetch("/api/users", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    id: row.original.id,
                                    role: e.target.value,
                                }),
                            });
                            mutate("/api/users");
                            showSnackbar("User role changed successfully!", "warning");
                        }}
                        sx={{ minWidth: 30 }}
                    >
                        <MenuItem value="super_admin">Super</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="owner">Owner</MenuItem>
                    </Select>
                </Tooltip>)}
            </Box>
        ),
        renderBottomToolbarCustomActions: ({ table }) => {
            const selected = table.getSelectedRowModel().rows;
            return (
                <Box sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={selected.length === 0}
                        onClick={async () => {
                            setSelectedRows(selected.map((r) => r.original)); // 선택된 유저 저장
                            setBulkDeleteOpen(true);
                        }}
                    >
                        Delete Selected
                    </Button>
                    <Typography variant="body2">
                        {selected.length} row(s) selected
                    </Typography>
                </Box>
            );
        },
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Tooltip title="Reload">
                    <span>
                        <IconButton onClick={handleReload} disabled={isRefreshing}>
                            {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
        ),
        // renderBottomToolbarCustomActions: () => (
        //     <Box sx={{ display: "flex", gap: "1rem" }}>
        //         <Button
        //             color="success"
        //             variant="contained"
        //             onClick={handleSaveUsers}
        //             disabled={
        //                 Object.keys(editedUsers).length === 0 ||
        //                 Object.values(validationErrors).some((err) => !!err)
        //             }
        //         >
        //             Save
        //         </Button>
        //         {Object.values(validationErrors).some((err) => !!err) && (
        //             <Typography color="error">Fix errors before submitting</Typography>
        //         )}
        //     </Box>
        // ),
        // renderTopToolbarCustomActions: ({ table }) => (
        //   <Button variant="contained" onClick={() => table.setCreatingRow(true)}>
        //     Create New User
        //   </Button>
        // ),
        state: {
            isLoading,
            showAlertBanner: !!error,
            showProgressBars: isRefreshing,
        },
    });

    return (
        <>
            <MaterialReactTable table={table} />

            <ConfirmDialog
                open={confirmOpen}
                title="Delete User"
                message={`Are you sure you want to delete ${selectedRow?.email}?`}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                title="Delete Users"
                message={`Are you sure you want to delete ${selectedRows.length} users?`}
                onConfirm={handleConfirmBulkDelete}
                onCancel={() => setBulkDeleteOpen(false)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // 위치 설정
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </>
    );
}

const validateEmail = (email: string) =>
    !!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
