// app/api/word/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();
    const accessToken = request.cookies.get('access_token')?.value;

    const kimiRes = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageData } },
              {
                type: 'text',
                text: `
                  分析图片内容，找出最能描述图片的一个英文单词，尽量选择更简单的A1~A2的词汇。
                  返回JSON数据：
                  {
                    "image_discription": "图片描述",
                    "representative_word": "图片代表的英文单词",
                    "example_sentence": "结合英文单词和图片描述，给出一个简单的例句",
                    "explaination": "结合图片解释英文单词, 段落以Look at...开头，将段落分句，每一句单独一行，解释的最后给一个日常生活有关的问句？",
                    "explaination_replys": ["根据explaination给出的回复1", "根据explaination给出的回复2"]
                  }
                `,
              },
            ],
          },
        ],
      }),
    });

    if (!kimiRes.ok) {
      const errText = await kimiRes.text();
      console.error('Kimi Error:', errText);
      return NextResponse.json({ error: '分析失败' }, { status: 500 });
    }

    const kimiData = await kimiRes.json();
    const replyContent = kimiData.choices[0].message.content;
    const parsed = JSON.parse(replyContent);

    // 活跃度：生成英语结果成功 +1（有登录用户时）
    try {
      if (accessToken) {
        const payload = await verifyToken(accessToken);
        const userId = payload?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: Number(userId) },
            data: { activeScore: { increment: 1 } },
          });
        }
      }
    } catch (e) {
      console.warn('Update activeScore on word generate failed:', e);
    }

    return NextResponse.json({
      word: parsed.representative_word,
      sentence: parsed.example_sentence,
      explainations: parsed.explaination.split('\n').filter(Boolean),
      expReply: parsed.explaination_replys || [],
    });
  } catch (error) {
    console.error('Word analysis error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}