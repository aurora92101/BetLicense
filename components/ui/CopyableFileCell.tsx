// components/CopyableFileCell.tsx
"use client";

import { useState } from "react";
import {
  Box,
  Tooltip,
  IconButton,
  Typography,
  useTheme,
  Link as MUILink,
} from "@mui/material";
import { Copy as CopyIcon, Check as CheckIcon } from "lucide-react";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

export default function CopyableFileCell({
  url,
  isAdmin = false,
  label, // 추가
}: {
  url?: string;
  isAdmin?: boolean;
  label?: string; // 추가
}) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <Typography
        sx={{
          color: mode === "dark" ? "rgba(229,240,255,0.55)" : "rgba(15,23,42,0.45)",
          fontSize: 14,
        }}
      >
        —
      </Typography>
    );
  }

  const rawFileName = url.split("/").pop();

  const textColorAdmin = mode === "dark" ? "#D9E8FF" : "#0F172A";
  const textColorUser = mode === "dark" ? "#D9E8FF" : "#0F172A";
  const iconColor = copied
    ? mode === "dark" ? "#34d399" : "#16a34a"
    : mode === "dark" ? "#8EC9FF" : "#2563eb";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 관리자: 전체 경로 표시 + 복사
  if (isAdmin) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: 420 }}>
        <Typography
          component="span"
          sx={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13.5,
            color: textColorAdmin,
          }}
          title={url}
        >
          {url}
        </Typography>

        <Tooltip title={copied ? "Copied!" : "Copy full path"}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              color: iconColor,
              p: 0.5,
              transition: "color 0.15s ease",
              "&:hover": {
                backgroundColor:
                  mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              },
            }}
          >
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // 유저: 예쁜 이름(label)로 표시, 툴팁엔 원본 파일명
  const displayName = label || rawFileName || "Download";

  return (
    <MUILink
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      underline="none"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        color: mode === "dark" ? "#8EC9FF" : "#2563eb",
        "&:hover": { textDecoration: "underline" },
        maxWidth: 360,
      }}
      title={rawFileName || displayName}
    >
      <CloudDownloadIcon sx={{ fontSize: 18 }} />
      <Typography
        component="span"
        sx={{
          fontSize: 14,
          color: textColorUser,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayName}
      </Typography>
    </MUILink>
  );
}
