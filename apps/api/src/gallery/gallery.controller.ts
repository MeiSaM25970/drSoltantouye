import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { GalleryService } from "./gallery.service";
import { AuthGuard } from "../common/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { assertRate } from "../common/rate";
import { uploadOptions, type SessionUser, type UploadedAsset } from "../common/http";

@Controller("gallery")
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  list() {
    return this.gallery.list();
  }

  @Get("manage")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  manage() {
    return this.gallery.list(true);
  }

  @Post("sync")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  sync(@CurrentUser() user: SessionUser, @Body() body: { token?: unknown }) {
    assertRate(`ig:${user.id}`, 4, 10 * 60 * 1000);
    const token = typeof body?.token === "string" ? body.token : undefined;
    return this.gallery.syncInstagram(token);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  create(@UploadedFile() file: UploadedAsset | undefined, @Body() body: Record<string, string | undefined>) {
    if (!file) throw new BadRequestException("فایل را انتخاب کنید");
    return this.gallery.create(file, body);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.gallery.update(id, body);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  remove(@Param("id") id: string) {
    return this.gallery.remove(id);
  }
}
