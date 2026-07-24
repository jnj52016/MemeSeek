import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemesModule } from './memes/memes.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, StorageModule, MemesModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
