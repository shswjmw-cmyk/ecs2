import { defineStore } from 'pinia'
import { ref } from 'vue'
import { interviewApi } from '../api/interview'

export const useInterviewStore = defineStore('interview', () => {
  const interviews = ref([])
  const currentInterview = ref(null)
  const loading = ref(false)

  async function fetchInterviews() {
    loading.value = true
    try {
      const res = await interviewApi.getList()
      interviews.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createInterview(data) {
    const res = await interviewApi.create(data)
    interviews.value.unshift(res.data)
    return res.data
  }

  async function fetchInterviewDetail(id) {
    loading.value = true
    try {
      const res = await interviewApi.getDetail(id)
      currentInterview.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function deleteInterview(id) {
    await interviewApi.delete(id)
    interviews.value = interviews.value.filter((i) => i.id !== id)
  }

  return { interviews, currentInterview, loading, fetchInterviews, createInterview, fetchInterviewDetail, deleteInterview }
})