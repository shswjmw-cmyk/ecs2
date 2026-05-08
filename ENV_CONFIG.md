# 环境变量配置说明

本项目分为后端（NestJS）和前端（Vue 3 + Vite）两部分，各自需要独立的 `.env` 文件。

---

## 后端

在 `backend/` 目录下创建 `.env` 文件：

```env
# ========== 数据库 ==========
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=ecs_interview
DB_SYNCHRONIZE=true
DB_LOGGING=true

# ========== JWT ==========
JWT_SECRET=ecs-dev-secret-change-in-prod

# ========== 服务端口 ==========
PORT=3000

# ========== 阿里云百炼 ==========
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DB_HOST` | 否 | `localhost` | MySQL 主机地址 |
| `DB_PORT` | 否 | `3306` | MySQL 端口 |
| `DB_USERNAME` | 否 | `root` | MySQL 用户名 |
| `DB_PASSWORD` | 否 | 空 | MySQL 密码 |
| `DB_DATABASE` | 否 | `ecs_interview` | 数据库名称，需提前创建 |
| `DB_SYNCHRONIZE` | 否 | `false` | 是否自动同步 Entity 到数据库表结构。开发环境设为 `true`，**生产环境务必设为 `false`** |
| `DB_LOGGING` | 否 | `false` | 是否打印 SQL 日志，开发调试用 |
| `JWT_SECRET` | 否 | `ecs-dev-secret` | JWT 签名密钥，**生产环境必须更换为随机强密码** |
| `PORT` | 否 | `3000` | 后端服务监听端口 |
| `DASHSCOPE_API_KEY` | 是 | 无 | 阿里云百炼 API Key，用于 ASR 语音识别和 Qwen LLM 调用。在 [百炼控制台](https://bailian.console.aliyun.com/) 获取 |

### 数据库初始化

```sql
CREATE DATABASE IF NOT EXISTS ecs_interview DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

首次启动后端时，若 `DB_SYNCHRONIZE=true`，TypeORM 会自动创建所有表。

---

## 前端

在 `frontend/` 目录下创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `VITE_API_BASE_URL` | 否 | `http://localhost:3000` | 后端 API 地址。本地开发指向后端端口，部署时改为实际服务地址 |

---

## 阿里云百炼 API Key 获取方式

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 登录并开通百炼服务
3. 在 **API-KEY 管理** 页面创建 API Key
4. 将 Key 填入后端 `.env` 的 `DASHSCOPE_API_KEY`

项目使用的模型：
- **ASR**：`paraformer-realtime-v2`（实时语音识别）
- **LLM**：`qwen-plus`（摘要 / 追问 / 信息缺口检测 / 访谈总结）

---

## 快速启动

```bash
# 1. 配置后端环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 DASHSCOPE_API_KEY 和数据库信息

# 2. 安装依赖并启动后端
cd backend && npm install && npm run start:dev

# 3. 配置前端环境变量（本地开发通常无需修改）
cd frontend && npm install && npm run dev
```

启动后访问 http://localhost:5173，使用测试账号 `test` / `test123` 登录。