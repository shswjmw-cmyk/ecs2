<template>
  <div class="project-list">
    <div class="page-header">
      <h2>访谈项目</h2>
      <el-button type="primary" @click="showCreateDialog = true">新建项目</el-button>
    </div>

    <el-table :data="projectStore.projects" v-loading="projectStore.loading" stripe>
      <el-table-column prop="name" label="项目名称" min-width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row)">{{ row.name }}</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该项目？项目下所有访谈不会被删除。" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建/编辑对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingProject ? '编辑项目' : '新建项目'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="项目描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingProject ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../../stores/project'
import { ElMessage } from 'element-plus'

const router = useRouter()
const projectStore = useProjectStore()
const formRef = ref(null)
const showCreateDialog = ref(false)
const submitting = ref(false)
const editingProject = ref(null)

const form = reactive({ name: '', description: '' })
const rules = { name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }] }

function openEdit(project) {
  editingProject.value = project
  form.name = project.name
  form.description = project.description || ''
  showCreateDialog.value = true
}

function closeDialog() {
  showCreateDialog.value = false
  editingProject.value = null
  form.name = ''
  form.description = ''
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (editingProject.value) {
      await projectStore.updateProject(editingProject.value.id, { name: form.name, description: form.description })
      ElMessage.success('项目已更新')
    } else {
      await projectStore.createProject({ name: form.name, description: form.description })
      ElMessage.success('项目创建成功')
    }
    closeDialog()
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id) {
  await projectStore.deleteProject(id)
  ElMessage.success('项目已删除')
}

function goDetail(project) {
  router.push(`/projects/${project.id}`)
}

onMounted(() => {
  projectStore.fetchProjects()
})
</script>

<style scoped>
.project-list {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
}
</style>