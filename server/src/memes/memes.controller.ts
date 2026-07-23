import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateMemeDto } from './dto/create-meme.dto';
import { FindMemesDto } from './dto/find-memes.dto';
import { UpdateMemeDto } from './dto/update-meme.dto';
import { MemesService } from './memes.service';

@Controller('memes')
export class MemesController {
  constructor(private readonly memesService: MemesService) {}

  @Post()
  create(@Body() dto: CreateMemeDto) {
    return this.memesService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindMemesDto) {
    return this.memesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemeDto) {
    return this.memesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.memesService.remove(id);
  }
}
