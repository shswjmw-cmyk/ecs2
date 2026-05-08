<template>
  <div class="interview-list">
    <div class="page-header">
      <h2>访谈列表</h2>
      <div class="header-actions">
        <el-button @click="router.push('/projects')">项目管理</el-button>
        <el-button type="primary" @click="router.push('/interviews/create')">新建访谈</el-button>
        <el-button @click="handleLogout">退出登录</el-button>
      </div>
    </div>

    <el-input v-model="searchKey" placeholder="搜索访谈..." clearable style="margin-bottom: 16px; max-width: 400px" />

    <el-table :data="filteredList" v-loading="interviewStore.loading" stripe>
      <el-table-column prop="title" label="访谈标题" min-width="200" />
      <el-table-column prop="projectName" label="关联项目" width="150" />
      <el-table-column prop="researchGoal" label="研究目标" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusMap[row.status]?.type">{{ statusMap[row.status]?.label }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goLive(row)">进入访谈</el-button>
          <el-button link type="success" @click="goSummary(row)">查看总结</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInterviewStore } from '../../stores/interview'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const interviewStore = useInterviewStore()
const userStore = useUserStore()
const searchKey = ref('')

const statusMap = {
  draft: { label: '草稿', type: 'info' },
  ongoing: { label: '进行中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
}

const filteredList = computed(() => {
  if (!searchKey.value) return interviewStore.interviews
  const key = searchKey.value.toLowerCase()
  return interviewStore.interviews.filter(
    (i) => i.title.toLowerCase().includes(key) || i.researchGoal?.toLowerCase().includes(key),
  )
})

function goLive(row) {
  router.push(`/interviews/${row.id}/live`)
}

function goSummary(row) {
  router.push(`/interviews/${row.id}/summary`)
}

async function handleDelete(id) {
  await interviewStore.deleteInterview(id)
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  interviewStore.fetchInterviews()
})
</script>

<style scoped>
.interview-list {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}
.page-header h2 {
  margin: 0;
}
</style>