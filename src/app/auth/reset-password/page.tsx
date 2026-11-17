import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell } from "@/components/auth/auth-shell";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <AuthShell mode="reset" configured={isSupabaseConfigured()} />;
}
