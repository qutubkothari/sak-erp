import { Module } from "@nestjs/common";
import { ItemsController } from "./controllers/items.controller";
import { ItemsService } from "./services/items.service";
import { ProjectsModule } from "../projects/projects.module";
import { EngineeringDrawingStorageService } from "./services/engineering-drawing-storage.service";

@Module({
  imports: [ProjectsModule],
  controllers: [ItemsController],
  providers: [ItemsService, EngineeringDrawingStorageService],
  exports: [ItemsService],
})
export class ItemsModule {}
