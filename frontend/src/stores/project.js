import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectApi } from '../api/project'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const currentProject = ref(null)
  const loading = ref(false)

  async function fetchProjects() {
    loading.value = true
    try {
      const res = await projectApi.getList()
      projects.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchProjectDetail(id) {
    loading.value = true
    try {
      const res = await projectApi.getDetail(id)
      currentProject.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function createProject(data) {
    const res = await projectApi.create(data)
    projects.value.unshift(res.data)
    return res.data
  }

  async function updateProject(id, data) {
    const res = await projectApi.update(id, data)
    const idx = projects.value.findIndex((p) => p.id === id)
    if (idx !== -1) projects.value[idx] = res.data
    if (currentProject.value?.id === id) currentProject.value = res.data
    return res.data
  }

  async function deleteProject(id) {
    await projectApi.delete(id)
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  return { projects, currentProject, loading, fetchProjects, fetchProjectDetail, createProject, updateProject, deleteProject }
})