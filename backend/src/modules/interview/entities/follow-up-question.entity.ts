import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Interview } from './interview.entity'

@Entity('follow_up_questions')
export class FollowUpQuestion {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  interviewId: number

  @ManyToOne(() => Interview, (i) => i.followUpQuestions)
  @JoinColumn({ name: 'interviewId' })
  interview: Interview

  @Column({ type: 'text' })
  question: string

  @Column({ type: 'text' })
  reason: string

  @Column()
  priority: 'high' | 'medium' | 'low'

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'skipped'

  @Column({ default: false })
  isEdited: boolean

  @Column({ type: 'text', nullable: true })
  editedQuestion: string

  @CreateDateColumn()
  createdAt: Date
}