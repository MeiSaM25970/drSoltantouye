import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Delete, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { uploadOptions, type UploadedAsset } from "../common/http";
import { CatalogService } from "./catalog.service";
import { AuthGuard } from "../common/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";

@Controller("services")
export class ServicesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.services();
  }

  @Get("manage")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  manage() {
    return this.catalog.services(true);
  }

  @Get(":slug")
  one(@Param("slug") slug: string) {
    return this.catalog.serviceBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  create(@Body() body: unknown) {
    return this.catalog.createService(body);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.catalog.updateService(id, body);
  }

  @Post(":id/image")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  setImage(@Param("id") id: string, @UploadedFile() file: UploadedAsset | undefined) {
    if (!file) throw new BadRequestException("عکس را انتخاب کنید");
    return this.catalog.setServiceImage(id, file);
  }

  @Delete(":id/image")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  clearImage(@Param("id") id: string) {
    return this.catalog.clearServiceImage(id);
  }
}

@Controller("doctors")
export class DoctorsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.doctors();
  }

  @Get("manage/all")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN", "SECRETARY")
  manage() {
    return this.catalog.allDoctors();
  }

  @Get(":slug")
  one(@Param("slug") slug: string) {
    return this.catalog.doctorBySlug(slug);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.catalog.updateDoctor(id, body);
  }

  @Get(":id/hours")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN", "SECRETARY", "DENTIST")
  hours(@Param("id") id: string) {
    return this.catalog.hours(id);
  }

  @Put(":id/hours")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN")
  saveHours(@Param("id") id: string, @Body() body: unknown) {
    return this.catalog.saveHours(id, body);
  }

  @Get(":id/blocks")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN", "SECRETARY", "DENTIST")
  blocks(@Param("id") id: string) {
    return this.catalog.blocks(id);
  }

  @Post(":id/blocks")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN", "SECRETARY")
  addBlock(@Param("id") id: string, @Body() body: unknown) {
    return this.catalog.addBlock(id, body);
  }
}

@Controller("blocks")
export class BlocksController {
  constructor(private readonly catalog: CatalogService) {}

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("ADMIN", "SECRETARY")
  remove(@Param("id") id: string) {
    return this.catalog.removeBlock(id);
  }
}
