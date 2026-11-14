import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PatientsService } from "./patients.service";
import { AuthGuard } from "../common/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { assertRate } from "../common/rate";
import { CurrentUser } from "../common/current-user.decorator";
import { privateUploadOptions, type SessionUser, type UploadedAsset } from "../common/http";

@Controller("patients")
@UseGuards(AuthGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  search(@Query("q") q = "", @Query("filter") filter = "all") {
    return this.patients.search(q, filter);
  }

  @Get("summary")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  summary() {
    return this.patients.summary();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "ADMIN")
  create(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.patients.create(user, body);
  }

  // ── the signed-in patient's own file
  @Get("me")
  me(@CurrentUser() user: SessionUser) {
    return this.patients.me(user);
  }

  @Post("me/record")
  openMine(@CurrentUser() user: SessionUser) {
    return this.patients.openRecord(user, user.id, true);
  }

  @Patch("me/record")
  updateMine(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.patients.updateRecord(user, user.id, body, true);
  }

  @Post("me/attachments")
  @UseInterceptors(FileInterceptor("file", privateUploadOptions))
  attachMine(@CurrentUser() user: SessionUser, @UploadedFile() file: UploadedAsset, @Body("caption") caption?: string) {
    assertRate(`attachment:${user.id}`, 20, 60 * 60 * 1000);
    return this.patients.addAttachment(user, user.id, file, caption, true);
  }

  // ── staff view of any file
  @Get(":userId")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  one(@CurrentUser() user: SessionUser, @Param("userId") userId: string) {
    return this.patients.staffDetail(user, userId);
  }

  @Post(":userId/record")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  open(@CurrentUser() user: SessionUser, @Param("userId") userId: string) {
    return this.patients.openRecord(user, userId);
  }

  @Patch(":userId/record")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  update(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Body() body: unknown) {
    return this.patients.updateRecord(user, userId, body);
  }

  @Post(":userId/teeth")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  tooth(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Body() body: unknown) {
    return this.patients.setTooth(user, userId, body);
  }

  @Post(":userId/visits")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  visit(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Body() body: unknown) {
    return this.patients.addVisit(user, userId, body);
  }

  @Post(":userId/attachments")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  @UseInterceptors(FileInterceptor("file", privateUploadOptions))
  attachment(
    @CurrentUser() user: SessionUser,
    @Param("userId") userId: string,
    @UploadedFile() file: UploadedAsset,
    @Body("caption") caption?: string,
  ) {
    return this.patients.addAttachment(user, userId, file, caption);
  }

  @Delete(":userId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  removePatient(@CurrentUser() user: SessionUser, @Param("userId") userId: string) {
    return this.patients.deletePatient(user, userId);
  }

  @Delete(":userId/record")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  removeRecord(@CurrentUser() user: SessionUser, @Param("userId") userId: string) {
    return this.patients.deleteRecord(user, userId);
  }

  @Delete(":userId/attachments/:id")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "DENTIST", "ADMIN")
  removeAttachment(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Param("id") id: string) {
    return this.patients.removeAttachment(user, userId, id);
  }

  @Post(":userId/ledger")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "ADMIN")
  addLedger(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Body() body: unknown) {
    return this.patients.addLedger(user, userId, body);
  }

  @Delete(":userId/ledger/:id")
  @UseGuards(RolesGuard)
  @Roles("SECRETARY", "ADMIN")
  removeLedger(@CurrentUser() user: SessionUser, @Param("userId") userId: string, @Param("id") id: string) {
    return this.patients.removeLedger(user, userId, id);
  }
}
