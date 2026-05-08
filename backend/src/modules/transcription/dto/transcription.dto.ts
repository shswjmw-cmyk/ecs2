import { IsString, IsIn, IsNumberString } from 'class-validator'

export class UploadChunkDto {
  @IsString()
  @IsIn(['mic', 'system', 'mixed'])
  audioSource: 'mic' | 'system' | 'mixed'

  @IsNumberString()
  timestamp: string
}