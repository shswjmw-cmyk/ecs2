import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { Project } from '../../project/entities/project.entity'
import { User } from '../../auth/entities/user.entity'
import { Transcript } from './transcript.entity'
import { Summary } from './summary.entity'
import { FollowUpQuestion } from './follow-up-question.entity'

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ type: 'text' })
  researchGoal: string

  @Column({ nullable: true })
  intervieweeInfo: string

  @Column({ default: 'draft' })
  status: 'draft' | 'ongoing' | 'completed'

  @Column()
  projectId: number

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project

  @Column()
  createdBy: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User

  @OneToMany(() => Transcript, (t) => t.interview)
  transcripts: Transcript[]

  @OneToMany(() => Summary, (s) => s.interview)
  summaries: Summary[]

  @OneToMany(() => FollowUpQuestion, (f) => f.interview)
  followUpQuestions: FollowUpQuestion[]

  @Column({ type: 'text', nullable: true })
  finalSummary: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}