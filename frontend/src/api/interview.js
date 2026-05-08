import request from './request'

export const interviewApi = {
  getList: () => request.get('/interviews'),
  getDetail: (id) => request.get(`/interviews/${id}`),
  create: (data) => request.post('/interviews', data),
  update: (id, data) => request.put(`/interviews/${id}`, data),
  delete: (id) => request.delete(`/interviews/${id}`),
}