"use client";

import * as React from "react";
import { useTheme as useNextTheme } from "next-themes";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

export default function MUIThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = React.useState(false);

  // 클라이언트 마운트 후에만 렌더링 → SSR mismatch 방지
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedTheme === "dark" ? "dark" : "light",
          ...(resolvedTheme === "dark"
            ? {
              background: { default: "#0d1117", paper: "#161b22" },
              text: { primary: "#ffffff", secondary: "#a9a9a9" },
            }
            : {
              background: { default: "#fafafa", paper: "#ffffff" },
              text: { primary: "#111111", secondary: "#555555" },
            }),
        },
      }),
    [resolvedTheme]
  );

  if (!mounted) return null; // 클라이언트에서만 렌더링

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
