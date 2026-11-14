import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClinicService } from "./clinic.service";
import { uploadOptions, type UploadedAsset } from "../common/http";
import { AuthGuard } from "../common/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";

@Controller()
export class ClinicController {
  constructor(private readonly clinic: ClinicService) {}

  @Get("clinic")
  get() {
    return this.clinic.get();
  }

  @Patch("clinic")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  update(@Body() body: unknown) {
    return this.clinic.update(body);
  }

  @Post("clinic/logo")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  setLogo(@UploadedFile() file: UploadedAsset | undefined) {
    if (!file) throw new BadRequestException("عکس لوگو را انتخاب کنید");
    return this.clinic.setLogo(file);
  }

  @Delete("clinic/logo")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  clearLogo() {
    return this.clinic.clearLogo();
  }

  @Put("clinic/content")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  saveContent(@Body() body: unknown) {
    return this.clinic.saveContent(body);
  }

  @Post("clinic/content/image")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  setContentImage(@UploadedFile() file: UploadedAsset | undefined, @Body() body: { key?: unknown }) {
    if (!file) throw new BadRequestException("عکس را انتخاب کنید");
    return this.clinic.setContentImage(body?.key, file);
  }

  @Delete("clinic/content/:key")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  resetContent(@Param("key") key: string) {
    return this.clinic.resetContent(key);
  }

  @Get("faqs")
  faqs() {
    return this.clinic.faqs();
  }

  @Get("faqs/manage")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  manageFaqs() {
    return this.clinic.faqs(true);
  }

  @Post("faqs")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  createFaq(@Body() body: unknown) {
    return this.clinic.createFaq(body);
  }

  @Patch("faqs/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  updateFaq(@Param("id") id: string, @Body() body: unknown) {
    return this.clinic.updateFaq(id, body);
  }

  @Delete("faqs/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  removeFaq(@Param("id") id: string) {
    return this.clinic.removeFaq(id);
  }

  @Get("health")
  health() {
    return { ok: true };
  }
}
