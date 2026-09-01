import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemesModule } from './memes/memes.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';

const localAiOnly = process.env.LOCAL_AI_ONLY === 'true';

@Module({
  // CloudBase only needs the stateless local-media analysis endpoint. Keeping
  // the legacy database/upload modules out of this process also means Prisma
  // never attempts to connect during container startup.
  imports: localAiOnly
    ? [AiModule]
    : [PrismaModule, StorageModule, MemesModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
