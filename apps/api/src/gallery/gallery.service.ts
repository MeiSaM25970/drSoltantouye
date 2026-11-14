import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { galleryMetaSchema } from "@clinic/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseBody } from "../common/parse";
import { publicUploadPath, type UploadedAsset } from "../common/http";

type IgMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
};

const MAX_MEDIA_BYTES = 80 * 1024 * 1024;

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  list(all = false) {
    return this.prisma.galleryItem.findMany({
      where: all ? {} : { published: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  async create(file: UploadedAsset, body: Record<string, string | undefined>) {
    const count = await this.prisma.galleryItem.count();
    return this.prisma.galleryItem.create({
      data: {
        kind: file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE",
        url: publicUploadPath(file.filename),
        caption: body.caption?.slice(0, 2200) ?? "",
        instagramUrl: body.instagramUrl || null,
        sortOrder: body.sortOrder ? Number(body.sortOrder) : count,
        published: body.published !== "false",
      },
    });
  }

  async update(id: string, body: unknown) {
    const input = parseBody(galleryMetaSchema, body);
    try {
      return await this.prisma.galleryItem.update({
        where: { id },
        data: {
          caption: input.caption,
          instagramUrl: input.instagramUrl === "" ? null : input.instagramUrl,
          sortOrder: input.sortOrder,
          published: input.published,
        },
      });
    } catch {
      throw new NotFoundException("مورد گالری پیدا نشد");
    }
  }

  async remove(id: string) {
    const item = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("مورد گالری پیدا نشد");
    await this.prisma.galleryItem.delete({ where: { id } });
    const filename = item.url.split("/").pop();
    if (filename) await unlink(join(process.cwd(), "uploads", filename)).catch(() => undefined);
    return { ok: true };
  }

  async syncInstagram(token: string | undefined) {
    const accessToken = token?.trim() || process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
    if (!accessToken || accessToken.length < 20 || accessToken.length > 2000) {
      throw new BadRequestException("توکن اینستاگرام نیست. آن را در فرم یا در متغیر INSTAGRAM_ACCESS_TOKEN بگذارید.");
    }
    const posts = await this.instagramMedia(accessToken, "me/media");
    let imported = 0;
    let updated = 0;
    let failed = 0;
    let order = 0;
    for (const post of posts.slice(0, 12)) {
      const pieces = post.media_type === "CAROUSEL_ALBUM" && post.id
        ? await this.instagramMedia(accessToken, `${post.id}/children`, "id,media_type,media_url").catch(() => [])
        : [post];
      for (const piece of pieces) {
        const saved = await this.saveInstagramPiece(piece, post.caption ?? piece.caption ?? "", post.permalink ?? piece.permalink, order);
        if (saved === "imported") imported += 1;
        else if (saved === "updated") updated += 1;
        else failed += 1;
        order += 1;
      }
    }
    return { imported, updated, failed };
  }

  private async saveInstagramPiece(
    piece: IgMedia,
    caption: string,
    permalink: string | undefined,
    sortOrder: number,
  ): Promise<"imported" | "updated" | "failed"> {
    const externalId = piece.id?.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!externalId || !piece.media_url) return "failed";
    const kind = piece.media_type === "VIDEO" ? "VIDEO" : piece.media_type === "IMAGE" ? "IMAGE" : null;
    if (!kind) return "failed";
    const existing = await this.prisma.galleryItem.findUnique({ where: { externalId } });
    if (existing) {
      await this.prisma.galleryItem.update({
        where: { id: existing.id },
        data: { caption: caption.slice(0, 2200), instagramUrl: permalink ?? existing.instagramUrl, sortOrder },
      });
      return "updated";
    }
    try {
      const url = await this.downloadMedia(piece.media_url, externalId, kind);
      await this.prisma.galleryItem.create({
        data: {
          externalId,
          kind,
          url,
          caption: caption.slice(0, 2200),
          instagramUrl: permalink ?? null,
          sortOrder,
          published: true,
        },
      });
      return "imported";
    } catch {
      return "failed";
    }
  }

  private async instagramMedia(token: string, path: string, fields = "id,caption,media_type,media_url,permalink"): Promise<IgMedia[]> {
    const url = new URL(`https://graph.instagram.com/${path}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", "12");
    url.searchParams.set("access_token", token);
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body = (await response.json().catch(() => ({}))) as { data?: IgMedia[]; error?: { message?: string } };
    if (!response.ok) {
      throw new BadRequestException((body.error?.message || "اینستاگرام درخواست را رد کرد").slice(0, 180));
    }
    return Array.isArray(body.data) ? body.data : [];
  }

  private async downloadMedia(remoteUrl: string, externalId: string, kind: "IMAGE" | "VIDEO") {
    const response = await fetch(remoteUrl, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error("download failed");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_MEDIA_BYTES) throw new Error("unexpected size");
    const filename = `ig-${externalId}.${kind === "VIDEO" ? "mp4" : "jpg"}`;
    const dir = join(process.cwd(), "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), bytes);
    return publicUploadPath(filename);
  }
}
