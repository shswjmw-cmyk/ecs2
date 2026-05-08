<template>
  <div class="create-interview">
    <div class="page-header">
      <h2>新建访谈</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 700px">
      <el-form-item label="访谈标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入访谈标题" />
      </el-form-item>

      <el-form-item label="关联项目" prop="projectId">
        <el-select v-model="form.projectId" placeholder="请选择项目" style="width: 100%">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="研究目标" prop="researchGoal">
        <el-input v-model="form.researchGoal" type="textarea" :rows="4" placeholder="请描述本次访谈的研究目标与关注点" />
      </el-form-item>

      <el-form-item label="受访者信息">
        <el-input v-model="form.intervieweeInfo" placeholder="受访者姓名/职位（可选）" />
      </el-form-item>

      <el-form-item label="相关附件">
        <el-upload :auto-upload="false" :file-list="fileList" @change="handleFileChange">
          <el-button>选择文件</el-button>
        </el-upload>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit">创建并开始</el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useInterviewStore } from '../../stores/interview'
import { projectApi } from '../../api/project'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const interviewStore = useInterviewStore()
const formRef = ref(null)
const loading = ref(false)
const projects = ref([])
const fileList = ref([])

const form = reactive({
  title: '',
  projectId: '',
  researchGoal: '',
  intervieweeInfo: '',
})

const rules = {
  title: [{ required: true, message: '请输入访谈标题', trigger: 'blur' }],
  projectId: [{ required: true, message: '请选择关联项目', trigger: 'change' }],
  researchGoal: [{ required: true, message: '请输入研究目标', trigger: 'blur' }],
}

function handleFileChange(file) {
  fileList.value.push(file)
}

async function handleSubmit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const data = await interviewStore.createInterview(form)
    ElMessage.success('访谈创建成功')
    router.push(`/interviews/${data.id}/live`)
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const res = await projectApi.getList()
    projects.value = res.data
    // 从项目详情页跳转时自动选中项目
    if (route.query.projectId) {
      form.projectId = Number(route.query.projectId)
    }
  } catch {
    // handled
  }
})
</script>

<style scoped>
.create-interview {
  padding: 24px;
}
.page-header {
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
}
</style>