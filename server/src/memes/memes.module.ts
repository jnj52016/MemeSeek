import { Module } from '@nestjs/common';
import { MemesController } from './memes.controller';
import { MemesService } from './memes.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [MemesController],
  providers: [MemesService],
})
export class MemesModule {}
