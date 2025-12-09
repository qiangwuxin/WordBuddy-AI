// app/api/pet-outfit/generate.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { verifyToken } from '@/lib/jwt'
import { CozeAPI } from '@coze/api'

const UPLOAD_DIR = join(process.cwd(), 'public', 'pet-outfits')
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  try {
    // ——— 验证用户身份 ———
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let userId: string | null = null
    if (accessToken) {
      const p = await verifyToken(accessToken)
      if (p?.userId) userId = String(p.userId)
    }
    if (!userId && refreshToken) {
      const p = await verifyToken(refreshToken)
      if (p?.userId) userId = String(p.userId)
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ——— 解析请求 body ———
    const body = await request.json()
    const { imageData, style, uniformNumber, uniformColor, position, shootingHand } = body
    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    // ——— 检查 Coze 配置 ———
    const COZE_API_KEY = process.env.COZE_API_KEY
    const COZE_BOT_ID = process.env.COZE_BOT_ID
    const COZE_WORKFLOW_ID = process.env.COZE_WORKFLOW_ID
    const COZE_SPACE_ID = process.env.COZE_SPACE_ID
    if (!COZE_API_KEY || !COZE_BOT_ID || !COZE_WORKFLOW_ID) {
      return NextResponse.json({ error: 'Coze configuration missing' }, { status: 500 })
    }

    // ——— 保存原图 ———
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const timestamp = Date.now()
    const origName = `original_${userId}_${timestamp}.jpg`
    const origPath = join(UPLOAD_DIR, origName)
    writeFileSync(origPath, buffer)
    const originalImageUrl = `/pet-outfits/${origName}`

    // ——— 初始化 Coze 客户端 ———
    const coze = new CozeAPI({
      token: COZE_API_KEY,
      baseURL: 'https://api.coze.cn',
    })

    // ——— 构造 workflow 参数（关键修正部分）———
    // 确保所有字段类型和值严格匹配工作流定义

    // shooting_hand: 必须是 0 或 1（数字）
    const finalShootingHand = typeof shootingHand === 'number' && (shootingHand === 0 || shootingHand === 1)
      ? shootingHand
      : 0

    // position: 必须是 1, 2, 3（数字）
    const finalPosition = [1, 2, 3].includes(Number(position)) ? Number(position) : 1

    // uniform_number: 数字，0–99
    const finalUniformNumber = Number.isFinite(Number(uniformNumber))
      ? Math.min(99, Math.max(0, Number(uniformNumber)))
      : 10

    // uniform_color: 必须是 ["红", "蓝", "绿", "黄", "白", "黑"]
    const validColors = ['红', '蓝', '绿', '黄', '白', '黑']
    const colorMap: Record<string, string> = {
      '红色': '红',
      '蓝色': '蓝',
      '绿色': '绿',
      '黄色': '黄',
      '白色': '白',
      '黑色': '黑',
    }
    const mappedColor = colorMap[uniformColor] || uniformColor
    const finalUniformColor = validColors.includes(mappedColor) ? mappedColor : '红'

    // style: 必须是 ["写实", "卡通", "动漫"]
    const validStyles = ['写实', '卡通', '动漫']
    const finalStyle = validStyles.includes(style) ? style : '写实'

    // ——— picture 使用可公开访问的 URL，避免 retrieve 权限问题 ———
    const publicBase = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const pictureUrl = `${publicBase}${originalImageUrl}`
    console.log('Using picture URL for workflow:', pictureUrl)

    // 工作流期望 picture 为字符串（UI 试跑里即是字符串）
    const parameters = {
      picture: pictureUrl,
      style: finalStyle,
      uniform_number: finalUniformNumber,
      uniform_color: finalUniformColor,
      shooting_hand: finalShootingHand,
      position: finalPosition,
    }

    console.log('🚀 Calling Coze workflow with parameters:', parameters)

    // ——— 调用 Coze 工作流 ———
    let botResponse: any
    try {
      const runResult = await coze.workflows.runs.create({
        workflow_id: COZE_WORKFLOW_ID,
        bot_id: COZE_BOT_ID,
        parameters,
        // @ts-ignore —— space_id 在部分租户必填
        ...(COZE_SPACE_ID ? { space_id: COZE_SPACE_ID } : {}),
        // 显式采用异步模式，与控制台试跑一致
        // @ts-ignore
        execute_mode: 2,
      })
      botResponse = runResult
    } catch (e: any) {
      console.error('Coze workflow execution error:', {
        message: e?.message,
        data: e?.response?.data || e?.rawError || e,
      })
      return NextResponse.json(
        { error: 'Coze workflow failed', details: e?.response?.data || e?.message || e?.toString?.() },
        { status: 500 }
      )
    }

    // ——— 提取结果图片 URL ———
    const extractImageUrl = (obj: any): string | null => {
      if (!obj) return null
      if (typeof obj === 'string') {
        if (obj.startsWith('http')) return obj
        if (obj.startsWith('data:image')) {
          const b64 = obj.replace(/^data:image\/\w+;base64,/, '')
          const buf = Buffer.from(b64, 'base64')
          const name = `result_${userId}_${timestamp}.jpg`
          const p = join(UPLOAD_DIR, name)
          writeFileSync(p, buf)
          return `/pet-outfits/${name}`
        }
      }
      if (typeof obj === 'object') {
        for (const key in obj) {
          const url = extractImageUrl(obj[key])
          if (url) return url
        }
      }
      return null
    }

    // 兼容 Coze 返回的 answer 字段（如 https://s.coze.cn/t/...），做多重兜底
    const pickAnswer = (...candidates: any[]) =>
      candidates.find((v) => typeof v === 'string' && v.trim().length > 0) || null

    // 尝试解析 data 为 JSON（部分 SDK 返回 string）
    let dataObj: any = botResponse?.data
    if (typeof dataObj === 'string') {
      try {
        dataObj = JSON.parse(dataObj)
      } catch (_) {
        // ignore
      }
    }

    const answerUrl = pickAnswer(
      dataObj?.answer,
      botResponse?.answer,
      dataObj?.data?.answer
    )

    // 递归搜索任意 http 字符串作为兜底
    const findHttpString = (obj: any, depth = 0): string | null => {
      if (!obj || depth > 6) return null
      if (typeof obj === 'string' && obj.startsWith('http')) return obj
      if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const hit = findHttpString(obj[key], depth + 1)
          if (hit) return hit
        }
      }
      return null
    }

    const resultImageUrl =
      answerUrl ||
      extractImageUrl(dataObj?.output ?? dataObj ?? botResponse) ||
      findHttpString(botResponse)
    if (!resultImageUrl) {
      console.error('No result image found in response:', botResponse)
      return NextResponse.json(
        { error: 'No image returned from Coze API' },
        { status: 500 }
      )
    }

    // ——— 增加活跃度（生成成功 +1）———
    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { activeScore: { increment: 1 } },
      })
    } catch (e) {
      console.warn('Update activeScore failed:', e)
    }

    // ——— 保存到数据库 ———
    let petOutfit
    try {
      petOutfit = await prisma.petOutfit.create({
        data: {
          userId: parseInt(userId),
          originalImageUrl,
          resultImageUrl,
          jerseyColor: finalUniformColor,
          jerseyNumber: finalUniformNumber,
          style: finalStyle,
          position: finalPosition,
          shootingHand: finalShootingHand,
        },
      })
    } catch (e) {
      console.error('DB save error:', e)
      // 即使 DB 失败，也返回图片
      return NextResponse.json({
        success: true,
        resultImageUrl,
        warning: 'Image generated but failed to save to DB',
      })
    }

    return NextResponse.json({ success: true, resultImageUrl, id: petOutfit.id })

  } catch (err: any) {
    console.error('Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}