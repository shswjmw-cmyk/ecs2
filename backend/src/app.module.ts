import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { ProjectModule } from './modules/project/project.module'
import { InterviewModule } from './modules/interview/interview.module'
import { TranscriptionModule } from './modules/transcription/transcription.module'
import { BailianModule } from './modules/bailian/bailian.module'
import databaseConfig from './config/database.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    AuthModule,
    ProjectModule,
    InterviewModule,
    TranscriptionModule,
    BailianModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}