import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ReceiptsService } from './receipts.service';
import { PatchReceiptDto } from './dto/patch-receipt.dto';

const UPLOAD_DIR = 'uploads';
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        // Random on-disk name so uploads never collide or overwrite.
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      fileFilter: (_req, file, cb) => {
        const ok = ALLOWED_EXT.has(extname(file.originalname).toLowerCase());
        cb(ok ? null : new BadRequestException('Unsupported image type'), ok);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async create(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image uploaded (field name: "image")');
    return this.receipts.createFromImage(file.path);
  }

  @Get()
  list() {
    return this.receipts.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receipts.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: PatchReceiptDto) {
    return this.receipts.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.receipts.remove(id);
    return { deleted: true };
  }
}
