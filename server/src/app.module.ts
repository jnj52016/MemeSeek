import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MemesModule } from './memes/memes.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MemesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
