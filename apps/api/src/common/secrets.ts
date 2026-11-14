/** Signing secret for sessions and captcha. Production refuses to start without a real one. */
export function jwtSecret() {
  const value = process.env.JWT_ACCESS_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET باید در محیط پروداکشن تنظیم شود (حداقل ۱۶ کاراکتر)");
  }
  return value || "dev-access-secret-change-me";
}
