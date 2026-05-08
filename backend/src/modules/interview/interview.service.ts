import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Interview } from './entities/interview.entity'
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto'

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private interviewRepo: Repository<Interview>,
  ) {}

  async findAll(userId?: number) {
    const qb = this.interviewRepo
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.project', 'project')
      .orderBy('interview.createdAt', 'DESC')

    if (userId) {
      qb.where('interview.createdBy = :userId', { userId })
    }

    const items = await qb.getMany()
    return items.map((item) => ({
      ...item,
      projectName: item.project?.name,
    }))
  }

  async findOne(id: number) {
    const interview = await this.interviewRepo.findOne({
      where: { id },
      relations: ['project', 'transcripts', 'summaries', 'followUpQuestions'],
    })
    if (!interview) {
      throw new NotFoundException('访谈不存在')
    }
    return interview
  }

  async create(dto: CreateInterviewDto, userId: number) {
    const interview = this.interviewRepo.create({
      ...dto,
      createdBy: userId,
      status: 'draft',
    })
    return this.interviewRepo.save(interview)
  }

  async update(id: number, dto: UpdateInterviewDto) {
    const interview = await this.findOne(id)
    Object.assign(interview, dto)
    return this.interviewRepo.save(interview)
  }

  async remove(id: number) {
    const interview = await this.findOne(id)
    return this.interviewRepo.remove(interview)
  }
}