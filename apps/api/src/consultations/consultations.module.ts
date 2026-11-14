import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TelegramModule } from "../telegram/telegram.module";
import { ConsultationsController } from "./consultations.controller";
import { ConsultationsService } from "./consultations.service";

@Module({
  imports: [AuthModule, TelegramModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
})
export class ConsultationsModule {}
