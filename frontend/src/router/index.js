import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/projects',
  },
  {
    path: '/projects',
    name: 'ProjectList',
    component: () => import('../views/project/ProjectList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('../views/project/ProjectDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/interviews',
    name: 'InterviewList',
    component: () => import('../views/interview/InterviewList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/interviews/create',
    name: 'CreateInterview',
    component: () => import('../views/interview/CreateInterview.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/interviews/:id/live',
    name: 'LiveInterview',
    component: () => import('../views/interview/LiveInterview.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/interviews/:id/summary',
    name: 'InterviewSummary',
    component: () => import('../views/interview/InterviewSummary.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/projects')
  } else {
    next()
  }
})

export default router