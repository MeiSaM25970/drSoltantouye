import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsService } from "../notifications/notifications.service";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";

@Module({
  imports: [AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService, NotificationsService],
  exports: [NotificationsService],
})
export class TelegramModule {}
