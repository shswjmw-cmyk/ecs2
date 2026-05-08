import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ProjectService } from './project.service'
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Get()
  findAll() {
    return this.projectService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.projectService.findOne(id)
  }

  @Get(':id/interviews')
  findInterviews(@Param('id') id: number) {
    return this.projectService.findInterviews(id)
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: any) {
    return this.projectService.create(dto, req.user.userId)
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.projectService.remove(id)
  }
}