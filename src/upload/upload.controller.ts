import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { S3Service, S3Folder } from '../common/services/s3.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly s3: S3Service) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  @ApiOperation({
    summary: 'Upload a single image to S3',
    description:
      'Uploads a JPEG, PNG, WebP or GIF image (max 5 MB) to the S3 bucket ' +
      'and returns the public URL. Use this URL in category or menu item create/update requests.\n\n' +
      '**Supported folders:** `categories`, `menu-items`, `restaurants`, `misc`',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file (max 5 MB)' },
      },
      required: ['file'],
    },
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    enum: ['categories', 'menu-items', 'restaurants', 'misc'],
    description: 'S3 folder/prefix to store the image under (default: misc)',
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded — returns the public S3 URL.',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        message: 'Image uploaded successfully',
        data: { url: 'https://your-bucket.s3.us-east-1.amazonaws.com/menu-items/uuid.jpg' },
        timestamp: '2026-02-21T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file / unsupported type / file too large.' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: S3Folder = 'misc',
  ) {
    const url = await this.s3.upload(file, folder);
    return { message: 'Image uploaded successfully', data: { url } };
  }
}
