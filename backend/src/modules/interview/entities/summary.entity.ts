import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Interview } from './interview.entity'

@Entity('summaries')
export class Summary {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  interviewId: number

  @ManyToOne(() => Interview, (i) => i.summaries)
  @JoinColumn({ name: 'interviewId' })
  interview: Interview

  @Column({ type: 'text' })
  oneLineSummary: string

  @Column({ type: 'json' })
  keyPoints: string[]

  @Column({ nullable: true })
  categoryTag: string

  @Column({ type: 'text', nullable: true })
  relationToGoal: string

  @Column({ type: 'text', nullable: true })
  contradictionInfo: string

  @Column()
  transcriptSegmentStart: number

  @Column({ nullable: true })
  transcriptSegmentEnd: number

  @Column({ default: false })
  isEdited: boolean

  @Column({ type: 'text', nullable: true })
  editedContent: string

  @CreateDateColumn()
  createdAt: Date
}