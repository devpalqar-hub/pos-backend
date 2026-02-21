import { Global, Module } from '@nestjs/common';
import { S3Service } from './services/s3.service';

/**
 * CommonModule exports S3Service so every feature module can inject it
 * without re-declaring it.
 */
@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class CommonModule {}
