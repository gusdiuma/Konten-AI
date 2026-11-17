import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/messages";

export type ErrorCode =
  | "ACS-CFG-01"
  | "ACS-AUTH-01"
  | "ACS-AUTH-02"
  | "ACS-AUTH-03"
  | "ACS-AUTH-04"
  | "ACS-AUTH-05"
  | "ACS-AUTH-06"
  | "ACS-AUTH-07"
  | "ACS-AUTH-08"
  | "ACS-AUTH-09"
  | "ACS-PRM-01"
  | "ACS-VAL-01"
  | "ACS-WS-01"
  | "ACS-WS-02"
  | "ACS-MBR-01"
  | "ACS-MBR-02"
  | "ACS-INV-01"
  | "ACS-PRF-01"
  | "ACS-BRD-01"
  | "ACS-BRD-02"
  | "ACS-DNA-01"
  | "ACS-CLR-01"
  | "ACS-FNT-01"
  | "ACS-AST-01"
  | "ACS-AST-02"
  | "ACS-REF-01"
  | "ACS-SYS-01";

const PUBLIC_MESSAGES_EN: Record<ErrorCode, string> = {
  "ACS-CFG-01": "Service configuration is incomplete.",
  "ACS-AUTH-01": "Sign in required to continue.",
  "ACS-AUTH-02": "Unable to sign in with those credentials.",
  "ACS-AUTH-03": "Unable to complete authentication request.",
  "ACS-AUTH-04": "Unable to create account with those details.",
  "ACS-AUTH-05": "Unable to create account with those details.",
  "ACS-AUTH-06": "Unable to create account right now. Please try again later.",
  "ACS-AUTH-07": "Unable to create account right now. Please try again later.",
  "ACS-AUTH-08": "Unable to create account right now. Please try again later.",
  "ACS-AUTH-09": "Unable to create account with those details.",
  "ACS-PRM-01": "You do not have permission for this action.",
  "ACS-VAL-01": "Please check your input and try again.",
  "ACS-WS-01": "Workspace is unavailable.",
  "ACS-WS-02": "Unable to save workspace changes.",
  "ACS-MBR-01": "Unable to update workspace member.",
  "ACS-MBR-02": "Workspace owner cannot be modified.",
  "ACS-INV-01": "Invitation is invalid or no longer active.",
  "ACS-PRF-01": "Unable to update profile.",
  "ACS-BRD-01": "Brand is unavailable.",
  "ACS-BRD-02": "Unable to save brand.",
  "ACS-DNA-01": "Unable to save Brand DNA.",
  "ACS-CLR-01": "Unable to update color palette.",
  "ACS-FNT-01": "Unable to update font settings.",
  "ACS-AST-01": "Unsupported file type, size, or filename.",
  "ACS-AST-02": "Unable to process asset file.",
  "ACS-REF-01": "Unable to save reference.",
  "ACS-SYS-01": "Request could not be completed.",
};

const PUBLIC_MESSAGES_ID: Record<ErrorCode, string> = {
  "ACS-CFG-01": "Pengaturan layanan belum lengkap.",
  "ACS-AUTH-01": "Silakan masuk untuk melanjutkan.",
  "ACS-AUTH-02": "Tidak dapat masuk dengan kredensial tersebut.",
  "ACS-AUTH-03": "Permintaan autentikasi tidak dapat diselesaikan.",
  "ACS-AUTH-04": "Tidak dapat membuat akun dengan data tersebut.",
  "ACS-AUTH-05": "Tidak dapat membuat akun dengan data tersebut.",
  "ACS-AUTH-06": "Tidak dapat membuat akun saat ini. Silakan coba lagi nanti.",
  "ACS-AUTH-07": "Tidak dapat membuat akun saat ini. Silakan coba lagi nanti.",
  "ACS-AUTH-08": "Tidak dapat membuat akun saat ini. Silakan coba lagi nanti.",
  "ACS-AUTH-09": "Tidak dapat membuat akun dengan data tersebut.",
  "ACS-PRM-01": "Anda tidak memiliki izin untuk tindakan ini.",
  "ACS-VAL-01": "Periksa kembali isian Anda.",
  "ACS-WS-01": "Workspace tidak tersedia.",
  "ACS-WS-02": "Gagal menyimpan perubahan workspace.",
  "ACS-MBR-01": "Gagal memperbarui anggota workspace.",
  "ACS-MBR-02": "Pemilik workspace tidak dapat diubah.",
  "ACS-INV-01": "Undangan tidak valid atau sudah tidak aktif.",
  "ACS-PRF-01": "Gagal memperbarui profil.",
  "ACS-BRD-01": "Brand tidak tersedia.",
  "ACS-BRD-02": "Gagal menyimpan brand.",
  "ACS-DNA-01": "Gagal menyimpan Brand DNA.",
  "ACS-CLR-01": "Gagal memperbarui palet warna.",
  "ACS-FNT-01": "Gagal memperbarui pengaturan font.",
  "ACS-AST-01": "Format, ukuran, atau nama file tidak didukung.",
  "ACS-AST-02": "Gagal memproses file aset.",
  "ACS-REF-01": "Gagal menyimpan referensi.",
  "ACS-SYS-01": "Permintaan tidak dapat diselesaikan.",
};

export interface SafeApiError {
  code: ErrorCode;
  message: string;
}

export function getPublicErrorMessage(
  code: ErrorCode,
  locale: Locale = "en"
): string {
  const dict = locale === "id" ? PUBLIC_MESSAGES_ID : PUBLIC_MESSAGES_EN;
  return dict[code] ?? dict["ACS-SYS-01"];
}

export function apiError(
  code: ErrorCode,
  status = 400,
  customMessage?: string,
  locale: Locale = "en"
) {
  return NextResponse.json(
    {
      error: {
        code,
        message: customMessage ?? getPublicErrorMessage(code, locale),
      },
    },
    { status }
  );
}
