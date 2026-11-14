import { Controller, Get, NotFoundException, Param, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { join } from "path";
import { AuthGuard } from "../common/auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { isStaff, privateUploadPath, type SessionUser } from "../common/http";
import { PrismaService } from "../prisma/prisma.service";

const NAME = /^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/;

/** Patient photos and X-rays: only the clinic and the patient they belong to can open them. */
@Controller("files")
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":name")
  async open(@CurrentUser() user: SessionUser, @Param("name") name: string, @Res() res: Response) {
    if (!NAME.test(name)) throw new NotFoundException();
    if (!isStaff(user.roles) && !(await this.ownedBy(user.id, privateUploadPath(name)))) throw new NotFoundException();
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });
    res.sendFile(join(process.cwd(), "uploads", "private", name), (error) => {
      if (error && !res.headersSent) res.status(404).end();
    });
  }

  private async ownedBy(userId: string, url: string) {
    const [message, attachment] = await Promise.all([
      this.prisma.consultationMessage.findFirst({ where: { imageUrl: url, consultation: { patientId: userId } }, select: { id: true } }),
      this.prisma.attachment.findFirst({ where: { url, record: { patientProfile: { userId } } }, select: { id: true } }),
    ]);
    return Boolean(message || attachment);
  }
}
