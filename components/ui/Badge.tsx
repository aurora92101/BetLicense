import { Box, Typography } from "@mui/material";

export function Badge({
  label,
  sx,
}: {
  label: string;
  sx?: any;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        borderRadius: 10,
        padding: "2px 8px",
        lineHeight: 1.2,
        // 배경/보더/호버 고정 (요청값 그대로)
        backgroundColor: "rgba(85,182,255,0.2)",
        border: "1px solid rgba(85,182,255,0.5)",
        "&:hover": { backgroundColor: "rgba(85,182,255,0.5)" },
        // 글자색은 상속 (부모/타이포의 color 사용)
        color: "inherit",
        ...sx,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: 0.2,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </Typography>
    </Box>
  );
}