import request from './request'

export const projectApi = {
  getList: () => request.get('/projects'),
  getDetail: (id) => request.get(`/projects/${id}`),
  getInterviews: (id) => request.get(`/projects/${id}/interviews`),
  create: (data) => request.post('/projects', data),
  update: (id, data) => request.put(`/projects/${id}`, data),
  delete: (id) => request.delete(`/projects/${id}`),
}