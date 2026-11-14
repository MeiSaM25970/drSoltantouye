import { createHash, randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";
import type { Response } from "express";
import type { Role } from "@clinic/shared";

export type SessionUser = {
  id: string;
  phone: string;
  fullName: string;
  roles: Role[];
};

export function isStaff(roles: readonly string[]) {
  return roles.some((role) => role === "SECRETARY" || role === "DENTIST" || role === "ADMIN");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken() {
  return randomBytes(32).toString("base64url");
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refreshToken, { ...cookieBase, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

function storage(folder: string[]) {
  return diskStorage({
    destination: (_req, _file, callback) => {
      const dir = join(process.cwd(), "uploads", ...folder);
      mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    // name and extension come from the server, never from the uploaded file name
    filename: (_req, file, callback) => {
      callback(null, `${randomBytes(16).toString("hex")}${EXTENSION[file.mimetype] ?? ""}`);
    },
  });
}

function options(folder: string[]) {
  return {
    storage: storage(folder),
    limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!EXTENSION[file.mimetype]) {
        callback(new BadRequestException("فقط عکس jpg، png، webp یا ویدیوی mp4 و webm مجاز است"), false);
        return;
      }
      callback(null, true);
    },
  };
}

/** Pictures the whole site may show (logo, landing page, services, gallery): served at /uploads. */
export const uploadOptions = options([]);

/** Patient photos and X-rays: stored apart and served only to the patient and the clinic at /files. */
export const privateUploadOptions = options(["private"]);

export function publicUploadPath(filename: string) {
  return `/uploads/${filename}`;
}

export function privateUploadPath(filename: string) {
  return `/files/${filename}`;
}

export type UploadedAsset = {
  filename: string;
  mimetype: string;
};

/** Deletes a previously uploaded picture. Built-in or external URLs are left alone. */
export async function removeUploadedFile(url: string | null | undefined) {
  if (!url) return;
  if (url.startsWith("/uploads/")) await unlink(join(process.cwd(), "uploads", basename(url))).catch(() => undefined);
  else if (url.startsWith("/files/")) await unlink(join(process.cwd(), "uploads", "private", basename(url))).catch(() => undefined);
}

export async function rejectNonImage(file: UploadedAsset) {
  if (file.mimetype.startsWith("image/")) return;
  await removeUploadedFile(publicUploadPath(file.filename));
  throw new BadRequestException("فقط عکس jpg، png یا webp مجاز است");
}
