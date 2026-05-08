import { Module } from '@nestjs/common'
import { BailianService } from './bailian.service'
import { RealtimeAsrService } from './realtime-asr.service'

@Module({
  providers: [BailianService, RealtimeAsrService],
  exports: [BailianService, RealtimeAsrService],
})
export class BailianModule {}