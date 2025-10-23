"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import LicenseUserTable from "@/components/table/LicenseUserTable";
import { useSnackbar } from "@/components/ui/providers/SnackbarContext";

export default function LicenseUserTableClient({ user }: { user: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get("status");
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!status) return;

    switch (status) {
      case "success":
        showSnackbar("Payment successful! Your license is being activated.", "success");
        break;
      case "failed":
        showSnackbar("Payment not completed. Please check your payment method.", "warning");
        break;
      case "error":
        showSnackbar("Something went wrong verifying your payment. Please contact support.", "error");
        break;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("status");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    router.replace(newUrl);
  }, [status, router, showSnackbar]);

  return (
    <div className="p-1">
      <h1 className="text-2xl font-bold mb-6">License Key Page</h1>
      <LicenseUserTable user={user} />
    </div>
  );
}
