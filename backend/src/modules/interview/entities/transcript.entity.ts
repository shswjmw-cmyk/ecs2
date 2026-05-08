import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Interview } from './interview.entity'

@Entity('transcripts')
export class Transcript {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  interviewId: number

  @ManyToOne(() => Interview, (i) => i.transcripts)
  @JoinColumn({ name: 'interviewId' })
  interview: Interview

  @Column({ type: 'text' })
  content: string

  @Column()
  speaker: string

  @Column()
  speakerRole: 'interviewer' | 'interviewee'

  @Column({ default: 'mic' })
  audioSource: 'mic' | 'system'

  @Column({ type: 'float' })
  startTime: number

  @Column({ type: 'float', nullable: true })
  endTime: number

  @CreateDateColumn()
  createdAt: Date
}