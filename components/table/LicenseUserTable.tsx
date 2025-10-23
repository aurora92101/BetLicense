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
  useMediaQuery,
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

type User = { id: string; email: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LicenseUserTable({ user }: { user: User }) {
  // filters
  const [filterStatus, setFilterStatus] =
    useState<"All" | "Live" | "Expired" | "Blocked">("Live");
  const [filterSubStatus, setFilterSubStatus] =
    useState<"Running" | "Closed" | "All">("Running");

  // ui
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm")); // <600
  const isSmDown = useMediaQuery(theme.breakpoints.down("md")); // <900

  const showSnackbar = (message: string, severity: any = "success") =>
    setSnackbar({ open: true, message, severity });

  // api url
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

  // data
  const { data: licenseKey = [], isLoading, error } = useSWR<LicenseKey[]>(
    buildApiUrl(),
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleReload = async () => {
    try {
      setIsRefreshing(true);
      await mutate(buildApiUrl());
      showSnackbar("Data refreshed", "info");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 공통 SX
  const selectBaseSx = {
    width: 136,
    minWidth: 136,
    flex: "0 0 136px",
    "& .MuiInputLabel-root": { fontSize: 12, top: -4 },
    "& .MuiInputBase-root": {
      height: 32,
      borderRadius: 10,
      paddingRight: 1,
      "& fieldset": { borderColor: "rgba(255,255,255,0.16)" },
      "&:hover fieldset": { borderColor: "rgba(255,255,255,0.28)" },
    },
    "& .MuiSelect-select": { paddingTop: "6px", paddingBottom: "6px", fontSize: 13 },
  } as const;

  const actionBtnSx = { height: 36, borderRadius: 999, px: 1.6, whiteSpace: "nowrap" } as const;

  // columns
  const columns = useMemo<MRT_ColumnDef<LicenseKey>[]>(() => {
    return [
      {
        header: "No",
        accessorKey: "id",
        size: 60,
        Cell: ({ row }) => row.index + 1,
      },
      { accessorKey: "bookieName", header: "Bookie Name" },
      {
        accessorKey: "keyName",
        header: "Key Name",
        size: 320,
        minSize: 260,
        maxSize: 640,
        enableResizing: true,
        Cell: ({ cell }) => {
          const value = cell.getValue<string | null>() ?? "";
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                width: "100%",
                minWidth: 0,
              }}
            >
              {/* 텍스트: flex:1 + ellipsis */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <KeyCopyInline
                  value={value}
                  themeMode={theme.palette.mode}
                  maxWidth="100%"
                  mode="text-only"
                />
              </Box>

              {/* 아이콘: 항상 오른쪽 고정 (세로 중앙) */}
              <KeyCopyInline
                value={value}
                themeMode={theme.palette.mode}
                mode="icon-only"
              />
            </Box>
          );
        },
        enableEditing: false,
      },
      {
        accessorKey: "usePeriod",
        header: "Use Period",
        Cell: ({ cell }) => <Typography>{cell.getValue<number>()} month(s)</Typography>,
      },
      {
        accessorKey: "startTime",
        header: "Start Time",
        Cell: ({ cell }) =>
          cell.getValue()
            ? new Date(cell.getValue<string>()).toLocaleString()
            : "—",
      },
      {
        accessorKey: "endTime",
        header: "End Time",
        Cell: ({ cell }) =>
          cell.getValue()
            ? new Date(cell.getValue<string>()).toLocaleString()
            : "—",
      },
      {
        accessorKey: "isRunning",
        header: "Status",
        Cell: ({ cell }) => {
          const value = cell.getValue<boolean>();
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
          const value = cell.getValue<boolean>();
          const endTime = row.original.endTime ? new Date(row.original.endTime) : null;
          const now = new Date();

          let label = value ? "Blocked" : "Active";
          let textColor = value ? "#ef5350" : "#2ddb36ff";

          if (!value && endTime) {
            const diffMs = endTime.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / 86400000);
            if (diffDays > 0) label = `Active (${diffDays} day${diffDays > 1 ? "s" : ""} left)`;
            else if (diffDays === 0) label = "Active (ends today)";
            else {
              label = "Active (expired)";
              textColor = "#ef5350";
            }
          }

          return (
            <span style={{ color: textColor }}>
              <Badge label={label} />
            </span>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSmDown, theme.palette.mode]);

  // 모바일: bookieName / keyName / isBlocked만 보이기
  const mobileVisibility: Record<string, boolean> = {
    bookieName: true,
    keyName: true,
    isBlocked: true,

    id: false,
    isRunning: false,
    usePeriod: false,
    startTime: false,
    endTime: false,
    introducerEmail: false,
    purchaseRoute: false,
    price: false,
    userEmail: false,
  };

  const table = useMaterialReactTable({
    columns,
    data: licenseKey,
    enableEditing: false,
    enableRowSelection: false,
    enableColumnOrdering: false,
    enableSorting: true,
    enableFilters: false,
    enableStickyHeader: true,
    enableColumnResizing: !isXs,
    layoutMode: "semantic",

    // PC는 현재 마당 그대로, 모바일은 3컬럼만
    initialState: {
      density: isSmDown ? "compact" : "comfortable",
      pagination: { pageIndex: 0, pageSize: isXs ? 5 : 10 },
      columnVisibility: isSmDown ? mobileVisibility : {},
      columnPinning: isSmDown
        ? { left: ["bookieName", "keyName"], right: [] }
        : { left: ["id"], right: [] },
    },
    state: {
      isLoading,
      showAlertBanner: !!error,
      showProgressBars: isRefreshing,
    },

    /** ✅ 상세 패널: 모바일에서만 활성화 */
    enableExpanding: isSmDown,
    renderDetailPanel: isSmDown
      ? ({ row }) => {
          const r = row.original;
          const now = new Date();
          const end = r.endTime ? new Date(r.endTime) : null;
          const diffDays = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;

          let accessLabel = r.isBlocked ? "Blocked" : "Active";
          let accessColor = r.isBlocked ? "#ef5350" : "#2ddb36ff";
          if (!r.isBlocked && end) {
            if (diffDays! > 0) accessLabel = `Active (${diffDays} day${diffDays! > 1 ? "s" : ""} left)`;
            else if (diffDays === 0) accessLabel = "Active (ends today)";
            else {
              accessLabel = "Active (expired)";
              accessColor = "#ef5350";
            }
          }

          return (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                width: "100%",
                display: "grid",
                gridTemplateColumns: isXs ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 1.25,
                fontSize: 14,
              }}
            >
              <DetailItem label="Bookie">{r.bookieName || "—"}</DetailItem>
              <DetailItem label="Key">
                <KeyCopyInline value={r.keyName ?? ""} themeMode={theme.palette.mode} />
              </DetailItem>
              <DetailItem label="Start">
                {r.startTime ? new Date(r.startTime).toLocaleString() : "—"}
              </DetailItem>
              <DetailItem label="End">
                {r.endTime ? new Date(r.endTime).toLocaleString() : "—"}
              </DetailItem>
              <DetailItem label="Access">
                <span style={{ color: accessColor }}>
                  <Badge label={accessLabel} />
                </span>
              </DetailItem>
            </Box>
          );
        }
      : undefined,

    /** 데스크톱에선 확장 컬럼 숨김 */
    displayColumnDefOptions: {
      "mrt-row-expand": {
        size: isSmDown ? 40 : 0,
        enableResizing: false,
      },
    },

    // styles (원본 유지)
    muiTablePaperProps: {
      sx: (theme) =>
        theme.palette.mode === "dark"
          ? {
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(10px)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              overflow: "hidden",
              "& .MuiTable-root": {
                backgroundColor: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(10px)",
              },
            }
          : null,
    },
    muiTableContainerProps: {
      sx: (theme) => ({
        maxHeight: "calc(100vh - 220px)",
        overflowY: "auto",
        ...(theme.palette.mode === "dark" && {
          "&::-webkit-scrollbar": { width: "6px", height: "6px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: "3px",
          },
        }),
      }),
    },
    muiTableHeadCellProps: {
      sx: (theme) =>
        theme.palette.mode === "dark"
          ? {
              backgroundColor: "rgba(30, 41, 59, 0.95)",
              color: "#f8fafc",
              fontWeight: 600,
              fontSize: "0.9rem",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              whiteSpace: "nowrap",
            }
          : { whiteSpace: "nowrap" },
    },
    muiTableBodyCellProps: {
      sx: (theme) =>
        theme.palette.mode === "dark"
          ? {
              color: "#e2e8f0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              fontSize: "0.92rem",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              maxWidth: isSmDown ? 160 : "unset",
            }
          : {
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              maxWidth: isSmDown ? 160 : "unset",
            },
    },
    muiTableBodyRowProps: {
      sx: (theme) =>
        theme.palette.mode === "dark"
          ? {
              backgroundColor: "rgba(22, 30, 46, 0.85)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.05)",
                transition: "background-color 0.2s ease",
              },
            }
          : null,
    },

    // toolbar chrome
    muiTopToolbarProps: {
      sx: (theme) => ({
        ...(theme.palette.mode === "dark" && {
          backgroundColor: "rgba(22, 30, 46, 0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          "& .MuiButton-root": { borderRadius: 8, textTransform: "none" },
          "& .MuiButton-contained": {
            backgroundColor: "rgba(85,182,255,0.2)",
            color: "#6ad0ff",
            border: "1px solid rgba(85,182,255,0.5)",
            "&:hover": { backgroundColor: "rgba(85,182,255,0.5)" },
          },
          "& .MuiIconButton-root": {
            color: "#e2eefb",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
          },
          "& .MuiOutlinedInput-root": { backgroundColor: "rgba(255,255,255,0.04)" },
        }),
      }),
    },

    muiBottomToolbarProps: {
      sx: (theme) =>
        theme.palette.mode === "dark"
          ? {
              backgroundColor: "rgba(22, 30, 46, 0.92)",
              backdropFilter: "blur(8px)",
              borderTop: "1px solid rgba(255,255,255,0.12)",

              /** ⛳️ 아래 스타일이 TablePagination의 Select까지 먹지 않게 범위 축소 */
              "& .MuiFormControl-root .MuiInputBase-root": {
                backgroundColor: "rgba(12,18,28,0.7)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#E5F0FF",
                "& .MuiSvgIcon-root": { color: "#b9d6ff" },
              },

              "& .MuiIconButton-root": {
                color: "#cfe6ff",
                "&.Mui-disabled": { color: "rgba(207,230,255,0.35)" },
                "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
              },
              "& .MuiTypography-root, & .MuiFormLabel-root": {
                color: "rgba(229,240,255,0.85)",
              },
            }
          : null,
    },

    // 상단 툴바 내용
    renderTopToolbarCustomActions: () => (
      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: { xs: 1.25, md: 1.5 },
          alignItems: "start",
        }}
      >
        {/* 왼쪽: Filters 카드 */}
        <Box
          sx={(t) => ({
            p: 1,
            borderRadius: 2,
            border:
              t.palette.mode === "dark"
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.08)",
            background:
              t.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
            display: "grid",
            rowGap: 1,
          })}
        >
          {/* 헤더: Reload + 캡션 */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Tooltip title="Reload">
              <span>
                <IconButton
                  onClick={handleReload}
                  disabled={isRefreshing}
                  size="small"
                  sx={{ width: 32, height: 32 }}
                >
                  {isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ ml: 1, opacity: 0.7, letterSpacing: 0.2 }}>
              Filters
            </Typography>
          </Box>

          {/* 폼: 모바일=1열/데스크톱=2열 */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1,
            }}
          >
            <FormControl
              size="small"
              variant="outlined"
              sx={{ ...selectBaseSx, width: "100%", minWidth: 0, flex: "1 1 auto" }}
            >
              <InputLabel shrink>Status</InputLabel>
              <Select
                notched
                label="Status"
                value={filterStatus}
                onChange={(e) => {
                  const v = e.target.value as typeof filterStatus;
                  setFilterStatus(v);
                  if (v !== "Live") setFilterSubStatus("Running");
                }}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Live">Live</MenuItem>
                <MenuItem value="Expired">Expired</MenuItem>
                <MenuItem value="Blocked">Blocked</MenuItem>
              </Select>
            </FormControl>

            <FormControl
              size="small"
              variant="outlined"
              disabled={filterStatus !== "Live"}
              sx={{ ...selectBaseSx, width: "100%", minWidth: 0, flex: "1 1 auto" }}
            >
              <InputLabel shrink>Substatus</InputLabel>
              <Select
                notched
                label="Substatus"
                value={filterSubStatus}
                onChange={(e) => setFilterSubStatus(e.target.value as typeof filterSubStatus)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Running">Running</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 📱 모바일 전용 푸터 */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              gap: 1,
              pt: 1,
              borderTop: (t) =>
                t.palette.mode === "dark"
                  ? "1px dashed rgba(255,255,255,0.12)"
                  : "1px dashed rgba(0,0,0,0.12)",
            }}
          >
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => setOpen(true)}
              size="small"
              sx={{
                ...actionBtnSx,
                gap: 0.75,
                boxShadow: "inset 0 0 0 1px rgba(106,208,255,0.35)",
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              Create
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="info"
              onClick={() => customerPortalAction()}
              size="small"
              sx={actionBtnSx}
            >
              Manage
            </Button>
          </Box>
        </Box>

        {/* 💻 데스크톱: 버튼 우측 */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpen(true)}
            size="small"
            sx={{
              ...actionBtnSx,
              gap: 0.75,
              boxShadow: "inset 0 0 0 1px rgba(106,208,255,0.35)",
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            Create New License
          </Button>

          <Button
            variant="outlined"
            color="info"
            onClick={() => customerPortalAction()}
            size="small"
            sx={actionBtnSx}
          >
            Manage Subscription
          </Button>
        </Box>
      </Box>
    ),
  });

  return (
    <>
      <MaterialReactTable table={table} />

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

      {open && <ModalPayment onClose={() => setOpen(false)} />}
    </>
  );
}

/** ✅ 제어형 Tooltip 기반 키 복사 컴포넌트 (텍스트/아이콘 분리 지원) */
function KeyCopyInline({
  value,
  themeMode,
  maxWidth,
  mode,
}: {
  value: string;
  themeMode: "light" | "dark";
  maxWidth?: number | string;
  mode?: "text-only" | "icon-only";
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const canCopy = !!value;
  const baseColor = themeMode === "dark" ? "#6ad0ff" : "#1976d2";
  const copiedColor = themeMode === "dark" ? "#2ddb36" : "#2e7d32";

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setOpen(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      /* noop */
    }
  };

  const textEl = (
    <span
      style={{
        display: "inline-block",
        maxWidth: maxWidth ?? "unset",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: copied ? copiedColor : baseColor,
        fontWeight: 500,
      }}
    >
      {value || "—"}
    </span>
  );

  const iconEl = copied ? (
    <CheckIcon fontSize="small" sx={{ opacity: 0.85, color: copiedColor, flexShrink: 0 }} />
  ) : (
    <ContentCopyIcon fontSize="small" sx={{ opacity: 0.75, color: baseColor, flexShrink: 0 }} />
  );

  return (
    <Tooltip
      title={copied ? "Copied!" : value || "—"}
      placement="top"
      enterDelay={300}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      disableInteractive={false}
    >
      <Box
        onClick={handleCopy}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onTouchStart={() => setOpen(true)}
        sx={{
          cursor: canCopy ? "pointer" : "default",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          maxWidth: mode === "text-only" ? (maxWidth ?? "100%") : "unset",
        }}
      >
        {mode !== "icon-only" && textEl}
        {mode !== "text-only" && iconEl}
      </Box>
    </Tooltip>
  );
}

// detail item component (p 내부에 div가 들어가는 문제 방지)
function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 0.75 }}>
      <Typography sx={{ color: "text.secondary", fontSize: 12, lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography component="div" sx={{ fontSize: 14, lineHeight: 1.3, wordBreak: "break-word" }}>
        {children}
      </Typography>
    </Box>
  );
}
