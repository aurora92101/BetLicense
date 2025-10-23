"use client";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  requireReason = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  requireReason?: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: (theme) =>
          theme.palette.mode === "dark"
            ? {
              backgroundColor: "rgba(12,18,28,0.85)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              borderRadius: 2,
            }
            : null,
      }}
    >
      <DialogTitle
        sx={(theme) =>
          theme.palette.mode === "dark"
            ? { color: "#E5F0FF", pb: 1.5 }
            : null
        }
      >
        {title}
      </DialogTitle>

      <DialogContent
        dividers
        sx={(theme) =>
          theme.palette.mode === "dark"
            ? {
              color: "rgba(229,240,255,0.85)",
              borderColor: "rgba(255,255,255,0.10)",
            }
            : null
        }
      >
        <p style={{ margin: 0 }}>{message}</p>

        {requireReason && (
          <TextField
            autoFocus
            margin="dense"
            label="Reason for deletion"
            type="text"
            fullWidth
            variant="outlined"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Enter reason (e.g. duplicate account, spam...)"
            sx={(theme) =>
              theme.palette.mode === "dark"
                ? {
                  mt: 2,
                  "& .MuiInputBase-root": {
                    backgroundColor: "rgba(12,18,28,0.70)",
                    borderRadius: 1.2,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.12)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(106,208,255,0.50)",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    { borderColor: "rgba(85,182,255,0.60)" },
                  "& .MuiInputLabel-root": {
                    color: "rgba(185,214,255,0.9)",
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#b9d6ff",
                  },
                  "& .MuiInputBase-input": { color: "#E5F0FF" },
                  "& .MuiFormHelperText-root": {
                    color: "rgba(229,240,255,0.75)",
                  },
                }
                : null
            }
          />
        )}
      </DialogContent>

      <DialogActions
        sx={(theme) =>
          theme.palette.mode === "dark"
            ? {
              borderTop: "1px solid rgba(255,255,255,0.10)",
              px: 2,
              py: 1.5,
              "& .MuiButton-root": { textTransform: "none", borderRadius: 1.2 },
            }
            : null
        }
      >
        <Button
          onClick={handleClose}
          color="inherit"
          sx={(theme) =>
            theme.palette.mode === "dark"
              ? {
                color: "rgba(229,240,255,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.22)",
                },
              }
              : null
          }
          variant="outlined"
        >
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={requireReason && reason.trim() === ""}
          sx={(theme) =>
            theme.palette.mode === "dark"
              ? {
                // 위험 버튼은 시안 테마 속에서도 경고색을 또렷하게
                backgroundColor: "rgba(239,83,80,0.85)",
                "&:hover": { backgroundColor: "rgba(239,83,80,1)" },
              }
              : null
          }
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
