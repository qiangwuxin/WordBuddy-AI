import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const APP_ID = process.env.AUDIO_APP_ID;
    const ACCESS_TOKEN = process.env.AUDIO_ACCESS_TOKEN;
    const CLUSTER_ID = process.env.AUDIO_CLUSTER_ID || 'volcano_tts';
    const VOICE_NAME =
      process.env.AUDIO_VOICE_NAME || 'zh_male_beijingxiaoye_moon_bigttts';

    if (!APP_ID || !ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Missing AUDIO_APP_ID or AUDIO_ACCESS_TOKEN' },
        { status: 500 },
      );
    }

    // 根據豆包語言合成大模型 HTTP API 規範組裝請求
    const reqid = Date.now().toString();

    const payload = {
      app: {
        appid: APP_ID,
        token: ACCESS_TOKEN,
        cluster: CLUSTER_ID,
      },
      user: {
        uid: 'user_' + reqid,
      },
      audio: {
        voice_type: VOICE_NAME,
        encoding: 'mp3', // 與前端 audio/mpeg 對應
        rate: 24000,
      },
      request: {
        reqid,
        text,
        text_type: 'plain',
        operation: 'query',
      },
    };

    const res = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      console.error('❌ TTS HTTP Error:', res.status, rawText);
      return NextResponse.json(
        { error: 'TTS request failed', status: res.status },
        { status: 500 },
      );
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ TTS parse error, raw response:', rawText);
      return NextResponse.json(
        { error: 'Invalid TTS response format' },
        { status: 500 },
      );
    }

    // 豆包 TTS 返回結構大致為：
    // { code, message, data: { audio: <base64>, ... } }
    // 有些情況 code 可能為 3000 但 message = 'Success'，實際是成功。
    const isBizSuccess =
      (data.code === 0 || data.code === 3000) &&
      (data.message === 'Success' || data.msg === 'Success');

    if (!isBizSuccess) {
      console.error('❌ TTS Biz Error:', data);
      return NextResponse.json(
        { error: data.msg || data.message || 'TTS business error', code: data.code },
        { status: 500 },
      );
    }

    let audioBase64: string | undefined;
    if (typeof data.data === 'string') {
      // 常見情況：data 直接是一段 base64 音訊字串
      audioBase64 = data.data;
    } else {
      audioBase64 =
        data.data?.audio || data.data?.audio_data || data.data?.data;
    }

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      console.error('❌ TTS no audio field in response:', data);
      return NextResponse.json(
        { error: 'No audio data in TTS response' },
        { status: 500 },
      );
    }

    // 前端期望的是 base64 字串，會在瀏覽器用 atob 解碼並生成 Blob
    return NextResponse.json({ data: audioBase64 });
  } catch (error) {
    console.error('💥 TTS Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}


