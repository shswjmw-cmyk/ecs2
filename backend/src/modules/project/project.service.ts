import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from './entities/project.entity'
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto'

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  async findAll() {
    return this.projectRepo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(id: number) {
    const project = await this.projectRepo.findOne({ where: { id } })
    if (!project) {
      throw new NotFoundException('项目不存在')
    }
    return project
  }

  async create(dto: CreateProjectDto, userId: number) {
    const project = this.projectRepo.create({ ...dto, createdBy: userId })
    return this.projectRepo.save(project)
  }

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.findOne(id)
    Object.assign(project, dto)
    return this.projectRepo.save(project)
  }

  async remove(id: number) {
    const project = await this.findOne(id)
    return this.projectRepo.remove(project)
  }

  async findInterviews(projectId: number) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['interviews'],
    })
    if (!project) {
      throw new NotFoundException('项目不存在')
    }
    return project.interviews
  }
}