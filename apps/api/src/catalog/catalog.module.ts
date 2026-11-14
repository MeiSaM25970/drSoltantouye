import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AvailabilityController } from "./availability.controller";
import { AvailabilityService } from "./availability.service";
import { BlocksController, DoctorsController, ServicesController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, DoctorsController, BlocksController, AvailabilityController],
  providers: [CatalogService, AvailabilityService],
  exports: [AvailabilityService, CatalogService],
})
export class CatalogModule {}
