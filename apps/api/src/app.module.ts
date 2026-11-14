import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ClinicModule } from "./clinic/clinic.module";
import { GalleryModule } from "./gallery/gallery.module";
import { CatalogModule } from "./catalog/catalog.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { PatientsModule } from "./patients/patients.module";
import { UsersModule } from "./users/users.module";
import { TelegramModule } from "./telegram/telegram.module";
import { CaptchaModule } from "./captcha/captcha.module";
import { FilesModule } from "./files/files.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClinicModule,
    GalleryModule,
    CatalogModule,
    TelegramModule,
    AppointmentsModule,
    ConsultationsModule,
    PatientsModule,
    UsersModule,
    CaptchaModule,
    FilesModule,
  ],
})
export class AppModule {}
