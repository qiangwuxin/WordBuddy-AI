import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { readMeta, finalFilePath } from '@/lib/upload-server';

export async function POST(request: NextRequest) {
  try {
    const { fileHash, fileName } = await request.json();

    if (!fileHash || !fileName) {
      return NextResponse.json(
        { error: 'File hash and file name are required' },
        { status: 400 }
      );
    }

    // Read file metadata to get final path
    const meta = readMeta(fileHash);
    if (!meta || !meta.complete) {
      return NextResponse.json(
        { error: 'File upload not completed yet' },
        { status: 400 }
      );
    }

    // Get file path
    const filePath = meta.finalPath || finalFilePath(fileHash, fileName);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file content
    let fileContent: string;
    try {
      const fileBuffer = readFileSync(filePath);
      // Try to read as text (UTF-8)
      fileContent = fileBuffer.toString('utf-8');
      
      // If file is too large, truncate it (Moonshot API has token limits)
      // Limit to approximately 100KB of text content
      const MAX_CONTENT_LENGTH = 100 * 1024;
      if (fileContent.length > MAX_CONTENT_LENGTH) {
        fileContent = fileContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[... Content truncated due to size limit ...]';
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to read file content' },
        { status: 500 }
      );
    }

    // Get Moonshot API key from environment variable
    const MOONSHOT_API_KEY = process.env.KIMI_API_KEY;
    if (!MOONSHOT_API_KEY) {
      return NextResponse.json(
        { error: 'Moonshot API key not configured' },
        { status: 500 }
      );
    }

    // Call Moonshot AI API
    const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
    const model = process.env.MOONSHOT_MODEL || 'moonshot-v1-8k';

    const prompt = `Please provide a comprehensive summary of the following document content. The summary should be in English and include:
1. Main topics and themes
2. Key points and findings
3. Important conclusions or recommendations

Document content:
${fileContent}`;

    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides clear and concise summaries of documents in English.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moonshot API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Moonshot API request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract summary from response
    const summary = data.choices?.[0]?.message?.content;
    
    if (!summary) {
      return NextResponse.json(
        { error: 'No summary generated from API response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: summary,
      model: model,
    });
  } catch (error: any) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

