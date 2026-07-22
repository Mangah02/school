// apps/api/src/core/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // ✅ Makes RedisService available everywhere
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
