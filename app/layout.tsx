import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { SWRConfig } from "swr";
import { getUser, getTeamForUser } from "@/lib/db/queries";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import MUIThemeProvider from "@/components/ui/providers/MUIThemeProvider";
import { SnackbarProvider } from "@/components/ui/providers/SnackbarContext";
import RouteLoadingProvider from "@/components/ui/providers/RouteLoadingProvider";
import ClientSWRProvider from "@/components/ui/providers/ClientSWRProvider";

export const metadata: Metadata = {
  title: "BetFriend: ",
  description: "Next.js + Tailwind + MUI + Drizzle integrated admin system",
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ["latin"] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const team = await getTeamForUser();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.className} bg-white dark:bg-gray-950 text-black dark:text-white`}
    >
      <body className="min-h-[100dvh] w-screen overflow-x-hidden transition-colors duration-300">
        <NextThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <MUIThemeProvider>
            <SWRConfig
              value={{ fallback: { "/api/user": user, "/api/team": team } }}
            >
              <SnackbarProvider>
                <RouteLoadingProvider>
                  <ClientSWRProvider>
                    {children}
                  </ClientSWRProvider>
                </RouteLoadingProvider>
              </SnackbarProvider>
            </SWRConfig>
          </MUIThemeProvider>
        </NextThemeProvider>
      </body>
    </html>
  );
}
