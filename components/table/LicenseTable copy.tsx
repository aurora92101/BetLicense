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
    InputAdornment,
    FormControl,
    InputLabel,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import useSWR, { mutate } from "swr";
import { EditIcon } from "lucide-react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { generateLicenseKey } from "@/lib/utils";
import { isNull } from "drizzle-orm";
import build from "next/dist/build";

type LicenseKey = {
    id: string,
    userId: string,
    userEmail: string,
    bookieId: string,
    bookieName: string,
    keyName: string,
    introducerId: string,
    introducerEmail: string,
    purchaseRoute: string,
    usePeriod: number,
    price: number,
    startTime: string | null,
    endTime: string | null,
    lastUsedTime: string | null,
    isBlocked: boolean,
    isRunning: boolean,
};

// fetcher: SWR 공용 fetch 함수
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LicenseTable() {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});
    const { data: users = [] } = useSWR<{ id: string; email: string; }[]>(
        "/api/users?flag=1",
        fetcher
    );
    const { data: bookies = [] } = useSWR<{ id: string; bookieName: string }[]>(
        "/api/bookie",
        fetcher
    );
    const [editedLicenseKey, setEditedLicenseKey] = useState<Record<string, LicenseKey>>({});

    // 필터 상태 추가
    const [filterStatus, setFilterStatus] = useState<"All" | "Live" | "Expired" | "Blocked">("Live");
    const [filterSubStatus, setFilterSubStatus] = useState<"Running" | "Closed">("Running");

    const [isCreating, setIsCreating] = useState(false);

    // API URL 동적 생성
    const buildApiUrl = () => {
        const base = "/api/license_key";
        const params = new URLSearchParams();

        if (filterStatus === "All") return base;

        if (filterStatus === "Live") {
            params.set("isBlocked", "false");
            params.set("endAfterNow", "true");

            // Live일 때 substatus에 따라 세분화
            if (filterSubStatus === "Running") {
                params.set("isRunning", "true");
            } else if (filterSubStatus === "Closed") {
                params.set("isRunning", "false");
            } else if (filterSubStatus === "All") {
                // All일 경우 isRunning은 지정하지 않음
                // → 서버에서는 endAfterNow=true && isBlocked=false 조건만 적용
            }
        }
        else if (filterStatus === "Expired") {
            params.set("isBlocked", "false");
            params.set("endAfterNow", "false");
        }
        else if (filterStatus === "Blocked") {
            params.set("isBlocked", "true");
        }

        const query = params.toString();
        console.log("🔹 buildApiUrl =>", query || "no query (All)");
        return query ? `${base}?${query}` : base;
    };

    // READ (유저 불러오기)
    const {
        data: licenseKey = [],
        isLoading,
        error,
    } = useSWR<LicenseKey[]>(buildApiUrl(), fetcher, { revalidateOnFocus: false });

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<LicenseKey | null>(null);

    const [bulkBlockOpen, setBulkBlockOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<LicenseKey[]>([]);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info" | "warning";
    }>({ open: false, message: "", severity: "success" });

    // Refresh
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [editValues, setEditValues] = useState<Record<string, any>>({});

    async function handleReload() {
        try {
            setIsRefreshing(true);
            await mutate(buildApiUrl()); // SWR 강제 재검증
            showSnackbar('Data refreshed', 'info');
        } finally {
            setIsRefreshing(false);
        }
    }

    const showSnackbar = (message: string, severity: "success" | "error" | "info" | "warning" = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    // UPDATE
    async function updateLicenses(license_key: LicenseKey[]) {
        await fetch("/api/license_key", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(license_key),
        });
        await mutate(buildApiUrl());
        showSnackbar("License Key updated successfully!", "success");
    }

    // DELETE
    async function blockLicense(id: string, reason: string, isBlocked: boolean) {
        await fetch(`/api/license_key?id=${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, isBlocked }), // 삭제 이유 함께 전달
        });
        await mutate(buildApiUrl());
        showSnackbar("License Key blocked successfully!", "error");
    }

    // 컬럼 정의
    const columns = useMemo<MRT_ColumnDef<LicenseKey>[]>(
        () => [
            {
                header: "No",
                accessorKey: "id",
                Cell: ({ row, table }) =>
                    row.index + 1 +
                    table.getState().pagination.pageIndex * table.getState().pagination.pageSize,
                size: 60,
                enableEditing: false,
            },
            {
                accessorKey: "userEmail",
                header: "User Email",
                Cell: ({ row }) => (
                    <span>{row.original.userEmail ?? "—"}</span>
                ),
                muiEditTextFieldProps: ({ row }) => ({
                    select: true,
                    value: row.original.userId ?? "",
                    onChange: (e) => {
                        const selectedId = e.target.value;
                        const selectedUser = users.find((u) => u.id === selectedId);

                        // userId, userEmail 동시 갱신
                        row.original.userId = selectedId;
                        row.original.userEmail = selectedUser?.email ?? "";

                        setEditedLicenseKey((prev) => ({
                            ...prev,
                            [row.id]: {
                                ...row.original,
                                userId: selectedId,
                                userEmail: selectedUser?.email ?? "",
                            } as LicenseKey,
                        }));
                    },
                    children: users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                            {user.email}
                        </MenuItem>
                    )),
                }),
            },


            {
                accessorKey: "bookieName",
                header: "Bookie Name",
                Cell: ({ cell }) => {
                    const value = cell.getValue<string | null>();
                    return <span>{value ?? "—"}</span>;
                },
                muiEditTextFieldProps: ({ cell, row }) => {
                    const id = `${row.id}_${cell.column.id}`;
                    const value =
                        editValues[id] ??
                        (row.original.bookieName ? row.original.bookieName : "");

                    return {
                        select: true,
                        value,
                        onChange: (e: any) => {
                            const selectedName = e.target.value;
                            const selected = bookies.find((b) => b.bookieName === selectedName);

                            // bookieId 동기화
                            row.original.bookieName = selectedName;
                            row.original.bookieId = selected?.id ?? row.original.bookieId;

                            setEditValues((prev) => ({ ...prev, [id]: selectedName }));

                            setEditedLicenseKey((prev) => ({
                                ...prev,
                                [row.id]: {
                                    ...row.original,
                                    bookieName: selectedName,
                                    bookieId: selected?.id ?? row.original.bookieId,
                                } as LicenseKey,
                            }));
                        },
                        children: bookies.map((b) => (
                            <MenuItem key={b.id} value={b.bookieName}>
                                {b.bookieName}
                            </MenuItem>
                        )),
                        error: !!validationErrors?.[cell.id],
                        helperText: validationErrors?.[cell.id],
                        required: true,
                    };
                },
            },
            {
                accessorKey: "keyName",
                header: "Key Name",
                muiEditTextFieldProps: ({ cell, row }) => {
                    const currentValue = row.original.keyName ?? "";

                    return {
                        value: currentValue,
                        required: true,
                        error: !!validationErrors?.[cell.id],
                        helperText: validationErrors?.[cell.id],
                        InputProps: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={async () => {
                                            const newKey = generateLicenseKey(row.original.userId);

                                            // 즉시 UI 갱신
                                            row.original.keyName = newKey;
                                            cell.row._valuesCache.keyName = newKey;

                                            // 로컬 편집 상태 반영
                                            setEditedLicenseKey((prev) => ({
                                                ...prev,
                                                [row.id]: {
                                                    ...row.original,
                                                    keyName: newKey,
                                                } as LicenseKey,
                                            }));

                                            // // 서버 반영
                                            // try {
                                            //     const res = await fetch("/api/license_key", {
                                            //         method: "PUT",
                                            //         headers: { "Content-Type": "application/json" },
                                            //         body: JSON.stringify({
                                            //             id: row.original.id,
                                            //             keyName: newKey,
                                            //             userId: row.original.userId,
                                            //             bookieId: row.original.bookieId,
                                            //             introducerId: row.original.introducerId,
                                            //         }),
                                            //     });

                                            //     if (res.ok) {
                                            //         // SWR 즉시 반영 (재요청 없이 화면 갱신)
                                            //         mutate(
                                            //             "/api/license_key",
                                            //             (prev: LicenseKey[] = []) =>
                                            //                 prev.map((item) =>
                                            //                     item.id === row.original.id
                                            //                         ? { ...item, keyName: newKey }
                                            //                         : item
                                            //                 ),
                                            //             false
                                            //         );
                                            //         showSnackbar("New license key generated & saved!", "success");
                                            //     } else {
                                            //         showSnackbar("Failed to save generated key.", "error");
                                            //     }
                                            // } catch (err) {
                                            //     console.error(err);
                                            //     showSnackbar("Unexpected error while saving key.", "error");
                                            // }
                                        }}
                                    >
                                        <AutorenewIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                        onBlur: (e) => {
                            const val = e.currentTarget.value.trim();
                            const err = !val ? "Required" : undefined;

                            setValidationErrors((prev) => ({ ...prev, [cell.id]: err }));

                            setEditedLicenseKey((prev) => ({
                                ...prev,
                                [row.id]: {
                                    ...row.original,
                                    keyName: val,
                                } as LicenseKey,
                            }));
                        },
                    };
                },
            },
            {
                accessorKey: "introducerEmail",
                header: "Introducer Email",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    type: "email",
                    value: row.original.introducerEmail ?? "",
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onChange: (e) => {
                        const email = e.target.value.trim();

                        let err: string | undefined;
                        if (email && !validateEmail(email)) {
                            err = "Invalid email format";
                        } else {
                            err = undefined;
                        }

                        // 즉시 상태 업데이트
                        setValidationErrors((prev) => ({
                            ...prev,
                            [cell.id]: err,
                        }));

                        // 편집 상태 저장
                        row.original.introducerEmail = email;
                        setEditedLicenseKey((prev) => ({
                            ...prev,
                            [row.id]: {
                                ...row.original,
                                introducerEmail: email,
                            } as LicenseKey,
                        }));
                    },
                }),
            },

            {
                accessorKey: "purchaseRoute",
                header: "Purchase Route",
                muiEditTextFieldProps: ({ cell, row }) => ({
                    required: true,
                    error: !!validationErrors?.[cell.id],
                    helperText: validationErrors?.[cell.id],
                    onBlur: (e) => {
                        const err = !e.currentTarget.value ? "Required" : undefined;
                        setValidationErrors({ ...validationErrors, [cell.id]: err });
                        setEditedLicenseKey({ ...editedLicenseKey, [row.id]: row.original });
                    },
                }),
            },
            {
                accessorKey: "usePeriod",
                header: "Use Period",
                Cell: ({ row }) => {
                    const value = row._valuesCache?.usePeriod ?? row.original.usePeriod;
                    return (
                        <Typography>{value} month{value > 1 ? "s" : ""}</Typography>
                    );
                },
                muiEditTextFieldProps: ({ row, table }) => ({
                    select: true,
                    value: row._valuesCache?.usePeriod ?? row.original.usePeriod,
                    onChange: (e) => {
                        const newValue = e.target.value;
                        // 로컬 상태 즉시 갱신 (UI에도 바로 반영)
                        table.setEditingRow({
                            ...row,
                            _valuesCache: {
                                ...row._valuesCache,
                                usePeriod: newValue
                            },
                        });
                    },
                    children: [
                        <MenuItem key="1" value={1}>1 month</MenuItem>,
                        <MenuItem key="3" value={3}>3 months</MenuItem>,
                        <MenuItem key="6" value={6}>6 months</MenuItem>,
                    ],
                }),
            },
            {
                accessorKey: "startTime",
                header: "Start Time",
                Cell: ({ cell }) => {
                    const value = cell.getValue<string | null>();
                    return <span>{value ? new Date(value).toLocaleString() : "—"}</span>;
                },
                muiEditTextFieldProps: ({ cell, row }) => {
                    const id = `${row.id}_${cell.column.id}`;

                    // UTC → 로컬 변환 함수
                    const toLocalDateTimeString = (utcString: string) => {
                        const date = new Date(utcString);
                        const tzOffset = date.getTimezoneOffset() * 60000; // 분 → ms
                        const local = new Date(date.getTime() - tzOffset);
                        return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                    };

                    const raw = row.original.startTime;
                    const formattedValue =
                        editValues[id] ??
                        (raw ? toLocalDateTimeString(raw as any) : "");

                    return {
                        type: "datetime-local",
                        value: formattedValue,
                        onChange: (e) => {
                            const val = e.target.value; // "2025-10-08T10:00"
                            setEditValues((prev) => ({ ...prev, [id]: val }));

                            // 즉시 반영
                            row.original.startTime = val;

                            setEditedLicenseKey((prev) => ({
                                ...prev,
                                [row.id]: {
                                    ...row.original,
                                    startTime: val,
                                } as LicenseKey,
                            }));
                        },
                    };
                },
            },
            {
                accessorKey: "endTime",
                header: "End Time",
                Cell: ({ cell }) => {
                    const value = cell.getValue<string | null>();
                    return <span>{value ? new Date(value).toLocaleString() : "—"}</span>;
                },
                muiEditTextFieldProps: ({ cell, row }) => {
                    const id = `${row.id}_${cell.column.id}`;

                    // UTC → 로컬 변환 함수
                    const toLocalDateTimeString = (utcString: string) => {
                        const date = new Date(utcString);
                        const tzOffset = date.getTimezoneOffset() * 60000; // 분 → ms
                        const local = new Date(date.getTime() - tzOffset);
                        return local.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                    };

                    const raw = row.original.endTime;
                    const formattedValue =
                        editValues[id] ??
                        (raw ? toLocalDateTimeString(raw as any) : "");

                    return {
                        type: "datetime-local",
                        value: formattedValue,
                        onChange: (e) => {
                            const val = e.target.value; // "2025-10-08T10:00"
                            setEditValues((prev) => ({ ...prev, [id]: val }));

                            // 즉시 반영
                            row.original.endTime = val;

                            setEditedLicenseKey((prev) => ({
                                ...prev,
                                [row.id]: {
                                    ...row.original,
                                    endTime: val,
                                } as LicenseKey,
                            }));
                        },
                    };
                },
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
            //         setEditedLicenseKey({ ...editedLicenseKey, [row.id]: row.original });
            //       },
            //     }),
            //   },

        ],
        [bookies, editedLicenseKey, validationErrors]
    );

    // UPDATE 저장 버튼 핸들러
    const handleSaveUsers = async () => {
        if (Object.values(validationErrors).some((err) => !!err)) return;
        await updateLicenses(Object.values(editedLicenseKey));
        setEditedLicenseKey({});
    };

    const handleBlockClick = (row: MRT_Row<LicenseKey>) => {
        setSelectedRow(row.original);
        setConfirmOpen(true);
    };

    const handleConfirmBlock = async (reason?: string) => {
        if (selectedRow) {
            const isCurrentlyBlocked = selectedRow.isBlocked;

            // 차단 해제일 경우 reason 필요 없음
            const message = `${reason || "no reason provided"}`;
            await blockLicense(
                selectedRow.id,
                message ?? "",
                !isCurrentlyBlocked
            );
            await mutate(buildApiUrl());
            showSnackbar(`The Key blocked (${reason || "no reason provided"})`, "info");
            setSelectedRow(null);
            setConfirmOpen(false);
        }
    };


    const handleCancelBlock = () => {
        setSelectedRow(null);
        setConfirmOpen(false);
    };

    const handleConfirmBulkBlock = async (reason?: string) => {
        for (const user of selectedRows) {
            await blockLicense(user.id, reason ?? "", !user.isBlocked);
        }
        showSnackbar(`Selected Keys blocked (${reason || "no reason provided"})`, "info");
        setSelectedRows([]);
        setBulkBlockOpen(false);
        await mutate(buildApiUrl());
    };

    const renderFilterToolbar = () => (
        <Box sx={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {/* Reload 버튼 */}
            <Tooltip title="Reload">
                <span>
                    <IconButton onClick={handleReload} disabled={isRefreshing}>
                        {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                    </IconButton>
                </span>
            </Tooltip>

            {/* 첫 번째 Select */}
            <FormControl size="small">
                <InputLabel>Status</InputLabel>
                <Select
                    label="Status"
                    value={filterStatus}
                    onChange={(e) => {
                        const val = e.target.value as any;
                        setFilterStatus(val);
                        if (val !== "Live") setFilterSubStatus("Running"); // reset
                    }}
                    sx={{ minWidth: 120 }}
                >
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Live">Live</MenuItem>
                    <MenuItem value="Expired">Expired</MenuItem>
                    <MenuItem value="Blocked">Blocked</MenuItem>
                </Select>
            </FormControl>

            {/* 두 번째 Select (Live일 때만 활성화) */}
            <FormControl size="small" disabled={filterStatus !== "Live"}>
                <InputLabel>Substatus</InputLabel>
                <Select
                    label="Substatus"
                    value={filterSubStatus}
                    onChange={(e) => setFilterSubStatus(e.target.value as any)}
                    sx={{ minWidth: 140 }}
                >
                    {/* Live일 때 세 가지 선택 가능 */}
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Running">Running</MenuItem>
                    <MenuItem value="Closed">Closed</MenuItem>
                </Select>
            </FormControl>

            <Button variant="contained" onClick={() => table.setCreatingRow(true)}>
                Create New License
            </Button>
        </Box>
    );

    // Material React Table 설정
    const table = useMaterialReactTable({
        columns,
        data: licenseKey,
        createDisplayMode: "row",
        editDisplayMode: "row",
        enableEditing: true,
        enableRowActions: true,
        positionActionsColumn: "last",
        positionCreatingRow: "bottom",
        enableRowSelection: true,      // 행 선택 활성화
        enableMultiRowSelection: true, // 여러 행 선택
        enableSelectAll: true,
        getRowId: (row) => row.id,
        // 새 행 저장 (POST)
        onCreatingRowSave: async ({ values, table }) => {
            setIsCreating(true);
            try {
                // 기본 유효성 검사
                console.log("full values:", JSON.stringify(values, null, 2));
                if (!values.userId || !values.keyName) {
                    showSnackbar("User and key name are required.", "error");
                    return;
                }

                const safeToISOString = (v: any) => {
                    if (!v) return null;
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? null : d.toISOString();
                };

                const payload = {
                    ...values,
                    startTime: safeToISOString(values.startTime),
                    endTime: safeToISOString(values.endTime),
                };

                console.log(payload);
                const res = await fetch("/api/license_key", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showSnackbar(err.error || "Failed to create license.", "error");
                    return;
                }

                await mutate(buildApiUrl()); // 즉시 UI 갱신
                showSnackbar("License created successfully!", "success");
                table.setCreatingRow(null); // 생성 모드 종료
            } catch (err) {
                console.error(err);
                showSnackbar("Unexpected error while creating license.", "error");
            }
            finally {
                setIsCreating(false);
            }
        },

        onEditingRowSave: async ({ exitEditingMode, row, values }) => {
            if (isCreating) return;
            const safeToISOString = (v: any) => {
                if (!v) return null;
                if (v instanceof Date) return v.toISOString();
                const d = new Date(v);
                return isNaN(d.getTime()) ? null : d.toISOString();
            };

            const { id, ...rest } = values;

            // introducerEmail 검사
            const introducerEmail = values.introducerEmail?.trim();
            const userEmail = row.original.userEmail;

            if (introducerEmail) {
                // 자기 이메일이면 금지
                if (introducerEmail === userEmail) {
                    showSnackbar("Introducer email cannot be your own.", "warning");
                    return;
                }

                // 존재 여부 검사
                const introducer = users.find((u) => u.email === introducerEmail);
                if (!introducer) {
                    showSnackbar("Introducer email does not exist in user list.", "error");
                    return;
                }

                // introducerId 갱신
                values.introducerId = introducer.id;
            }

            // 안전하게 변환된 payload 구성
            const payload = {
                id: row.original.id,
                ...rest,
                userId: row.original.userId,
                bookieId: row.original.bookieId,
                introducerId: values.introducerId ?? row.original.introducerId,
                keyName: row.original.keyName,
                startTime: safeToISOString(values.startTime),
                endTime: safeToISOString(values.endTime),
                lastUsedTime: safeToISOString(values.lastUsedTime),
            };

            try {
                const res = await fetch("/api/license_key", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showSnackbar(err.error || "Update failed.", "error");
                    return;
                }

                await mutate(buildApiUrl());
                showSnackbar("License updated successfully!", "success");
                exitEditingMode();
            } catch (err) {
                console.error(err);
                showSnackbar("Unexpected error occurred while saving.", "error");
            }
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
                {row.original.isBlocked === false && (<Tooltip title="IsRunning">
                    <Switch
                        checked={row.original.isRunning}
                        onChange={async (e) => {
                            await fetch("/api/license_key", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: row.original.id, isRunning: e.target.checked }),
                            });
                            await mutate(buildApiUrl());
                            showSnackbar("Running Station changed successfully!", "warning");
                        }}
                    />
                </Tooltip>)}
                <Tooltip title={row.original.isBlocked ? "Unblock" : "Block"}>
                    <IconButton
                        color={row.original.isBlocked ? "success" : "error"}
                        onClick={() => handleBlockClick(row)}
                    >
                        {row.original.isBlocked ? <LockOpenIcon /> : <BlockIcon />}
                    </IconButton>
                </Tooltip>
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
                            setBulkBlockOpen(true);
                        }}
                    >
                        Block Selected
                    </Button>
                    <Typography variant="body2">
                        {selected.length} row(s) selected
                    </Typography>
                </Box>
            );
        },
        renderTopToolbarCustomActions: renderFilterToolbar,
        // renderBottomToolbarCustomActions: () => (
        //     <Box sx={{ display: "flex", gap: "1rem" }}>
        //         <Button
        //             color="success"
        //             variant="contained"
        //             onClick={handleSaveUsers}
        //             disabled={
        //                 Object.keys(editedLicenseKey).length === 0 ||
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
        //     Create New License
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
                title={selectedRow?.isBlocked ? "Unblock License Key" : "Block License Key"}
                message={
                    selectedRow?.isBlocked
                        ? `Are you sure you want to unblock this key?`
                        : `Are you sure you want to block this key?`
                }
                onConfirm={handleConfirmBlock}
                onCancel={handleCancelBlock}
                requireReason={!selectedRow?.isBlocked} // 차단 시에만 이유 입력 활성화
            />


            <ConfirmDialog
                open={bulkBlockOpen}
                title="Block License Keys"
                message={`Are you sure you want to delete these keys?`}
                onConfirm={handleConfirmBulkBlock}
                onCancel={() => setBulkBlockOpen(false)}
                requireReason
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
