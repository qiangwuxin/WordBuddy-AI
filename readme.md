# WordBuddy AI

## 概要
- 宠物装扮生成：上传宠物图，设置风格/球衣参数，调用 Coze Workflow 生成形象并保存历史。
- 英语单词生成：上传图片，调用 Kimi（moonshot 8k vision）给出代表单词与解释。
- 活跃度：生成宠物形象成功 +1，英语生成成功（登录态）+1。
- 登录/刷新：JWT 鉴权，自动刷新。

## 技术栈
- 前端：Next.js 13+ App Router、React、Tailwind CSS、lucide-react、react-markdown
- 后端：Next.js API Routes、Prisma + MySQL
- AI/LLM：
  - Coze Workflow（宠物形象生成）
  - Moonshot 8k vision（图片 -> 英语单词/解释）
- 其他：dotenv、bcryptjs

## 目录结构（主要）
- `app/`
  - `pet_outfit/page.tsx` 宠物装扮页（主形象、生成表单、历史抽屉）
  - `profile/page.tsx` 个人中心（头像=最新形象、活跃度、历史）
  - `api/`
    - `auth/login|register|refresh` 鉴权
    - `pet-outfit/generate` 调用 Coze 生成并计活跃度
    - `pet-outfit/history` 获取历史
    - `user/me` 获取当前用户及 activeScore
    - `word` 调用 Kimi 生成英语单词并计活跃度
- `prisma/schema.prisma` 定义 `User(activeScore)`、`PetOutfit`
- `lib/jwt.ts` JWT 生成/校验、cookie 设置

## 数据库模型
```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  password     String
  refreshToken String?
  activeScore  Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  petOutfits   PetOutfit[]
}

model PetOutfit {
  id               Int      @id @default(autoincrement())
  userId           Int
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalImageUrl String
  jerseyColor      String   @default("红色")
  jerseyNumber     Int      @default(10)
  style            String   @default("写实")
  position         Int      @default(1) // 1=守门员, 2=防守队员, 3=前锋
  shootingHand     Int?
  resultImageUrl   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## 运行
```bash
cp .env.example .env   # 补全数据库、JWT_SECRET_KEY、COZE_*、KIMI_API_KEY
npm install
npx prisma migrate dev
npm run dev
```

## 功能亮点
- 宠物装扮：大图主展示 + 底部历史抽屉，仅展示生成结果图片；重新生成按钮展开表单。
- 个人中心：显示最新形象为头像、活跃度统计、历史图片网格。
- 活跃度：`pet-outfit/generate` 成功 +1；`word` 成功（需登录）+1。
- 鉴权：登录/注册/刷新，`/api/user/me` 返回用户与 activeScore。

## 依赖摘录（package.json）
- `next`, `react`, `tailwindcss`
- `@ai-sdk/openai`, `@ai-sdk/react`
- `@langchain/*`, `supabase`（项目中引用信息）
- `prisma`, `@prisma/client`, `bcryptjs`, `dotenv`, `lucide-react`, `react-markdown`

## 使用说明（核心流程）
1) 登录/注册获取会话。
2) 宠物装扮页上传图片 + 设置参数 -> 生成形象，成功后计分并入库，可在历史抽屉查看。
3) 个人中心查看活跃度、最新形象和历史网格。
4) 英语单词：上传图片到 `/api/word`，生成英文单词/解释，登录态下活跃度 +1。

## 注意
- 需配置 Coze Workflow 参数（COZE_API_KEY / BOT_ID / WORKFLOW_ID / SPACE_ID）。
- 需配置 Moonshot API Key（KIMI_API_KEY）。
- activeScore 目前只在两处增加：宠物生成成功、英语生成成功（登录态）。可按需拓展。