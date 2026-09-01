import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AiController } from './ai.controller';
import { LocalAiController } from './local-ai.controller';
import { AiService } from './ai.service';

const localAiOnly = process.env.LOCAL_AI_ONLY === 'true';

@Module({
  imports: localAiOnly ? [] : [PrismaModule, StorageModule],
  controllers: localAiOnly ? [LocalAiController] : [AiController, LocalAiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
