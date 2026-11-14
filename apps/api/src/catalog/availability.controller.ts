import { Controller, Get, Param, Query } from "@nestjs/common";
import { AvailabilityService } from "./availability.service";

@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get("days")
  days(
    @Query("doctorId") doctorId: string,
    @Query("serviceId") serviceId: string,
    @Query("from") from: string,
  ) {
    return this.availability.days(doctorId, serviceId, from);
  }

  @Get()
  slots(
    @Query("doctorId") doctorId: string,
    @Query("serviceId") serviceId: string,
    @Query("date") date: string,
  ) {
    return this.availability.slots(doctorId, serviceId, date);
  }
}
