// lib/audio.ts
import { useState } from 'react';


export async function generateAudio(text: string): Promise<string> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const { data } = await response.json();
    // 後端返回 base64 編碼的 mp3 音訊，這裡需要先解碼再建立 Blob
    const byteString = atob(data);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  } catch (error) {
    console.error('Audio generation failed:', error);
    throw error;
  }
}