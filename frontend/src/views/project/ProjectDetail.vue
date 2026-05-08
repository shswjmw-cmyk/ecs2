<template>
  <div class="project-detail">
    <div class="page-header">
      <el-button @click="router.push('/projects')" text>
        <el-icon><ArrowLeft /></el-icon> 返回项目列表
      </el-button>
    </div>

    <div v-if="project" class="project-info">
      <div class="info-header">
        <div>
          <h2>{{ project.name }}</h2>
          <p class="desc">{{ project.description || '暂无描述' }}</p>
        </div>
        <el-button type="primary" @click="router.push({ path: '/interviews/create', query: { projectId: project.id } })">
          新建访谈
        </el-button>
      </div>
    </div>

    <div class="interviews-section">
      <h3>访谈列表</h3>
      <el-table :data="interviews" v-loading="loadingInterviews" stripe>
        <el-table-column prop="title" label="访谈标题" min-width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/interviews/${row.id}/live`)">{{ row.title }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="researchGoal" label="研究目标" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type">{{ statusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/interviews/${row.id}/live`)">
              {{ row.status === 'ongoing' ? '进入访谈' : '查看' }}
            </el-button>
            <el-button link type="success" @click="router.push(`/interviews/${row.id}/summary`)">总结</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!loadingInterviews && interviews.length === 0" class="empty-tip">
        该项目下暂无访谈，点击上方「新建访谈」开始
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '../../stores/project'
import { projectApi } from '../../api/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const projectId = Number(route.params.id)

const project = ref(null)
const interviews = ref([])
const loadingInterviews = ref(false)

const statusMap = {
  draft: { label: '草稿', type: 'info' },
  ongoing: { label: '进行中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
}

onMounted(async () => {
  project.value = await projectStore.fetchProjectDetail(projectId)
  loadingInterviews.value = true
  try {
    const res = await projectApi.getInterviews(projectId)
    interviews.value = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } finally {
    loadingInterviews.value = false
  }
})
</script>

<style scoped>
.project-detail {
  padding: 24px;
}
.page-header {
  margin-bottom: 16px;
}
.project-info {
  margin-bottom: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.info-header h2 {
  margin: 0 0 8px;
}
.desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}
.interviews-section h3 {
  margin: 0 0 12px;
}
.empty-tip {
  text-align: center;
  color: #c0c4cc;
  padding: 40px 0;
  font-size: 14px;
}
</style>