// app/word/page.tsx
'use client'

import { useState } from 'react'
import PictureCard from '../components/pictureCard'
import { generateAudio } from '../../lib/audio'

export default function Word() {
  const [word, setWord] = useState('请上传图片')
  const [sentence, setSentence] = useState('')
  const [explainations, setExplainations] = useState<string[]>([])
  const [expReply, setExpReply] = useState<string[]>([])
  const [audio, setAudio] = useState('')
  const [detailExpand, setDetailExpand] = useState(false)
  const [imgPreview, setImgPreview] = useState(
    'https://ts3.tc.mm.bing.net/th/id/OIP-C.m5iW5EirBv6JFk4f79bEGwHaEo?rs=1&pid=ImgDetMain&o=7&rm=3'
  )

  const uploadImg = async (imageData: string) => {
    setImgPreview(imageData)
    setWord('正在分析中...')
    setSentence('')
    setExplainations([])
    setExpReply([])
    setAudio('')

    try {
      // 1. 调用 /api/word 获取文本结果
      const wordRes = await fetch('/api/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })

      if (!wordRes.ok) throw new Error('分析失败')
      const wordData = await wordRes.json()

      setWord(wordData.word)
      setSentence(wordData.sentence)
      setExplainations(wordData.explainations)
      setExpReply(wordData.expReply)

      // 2. 调用 generateAudio 获取音频
      const audioUrl = await generateAudio(wordData.sentence)
      setAudio(audioUrl)
    } catch (error) {
      console.error('请求失败:', error)
      setWord('分析失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-200 to-amber-800 flex flex-col items-center justify-start p-4">
      <div className="w-64 h-80 bg-amber-900 rounded-xl shadow-lg overflow-hidden mb-6 flex flex-col items-center justify-center">
        <PictureCard
          word={word}
          audio={audio}
          uploadImg={uploadImg}
          imgPreview={imgPreview}
        />
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="text-center text-white font-medium mb-4">{sentence}</div>
        <button
          onClick={() => setDetailExpand(!detailExpand)}
          className="w-full py-2 px-4 bg-black text-white font-bold rounded-lg mb-4"
        >
          Talk about it
        </button>

        {detailExpand && (
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg mx-auto border border-gray-200">
            <div className="mb-4">
              <img
                src={imgPreview}
                alt="preview"
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* 說明區：純描述句子 */}
            <div className="space-y-2 mb-4">
              {explainations.slice(0, -1).map((explanation, index) => (
                <p key={index} className="text-gray-700 leading-relaxed">
                  {explanation}
                </p>
              ))}
            </div>

            {/* 問句 + 標題提示：下面會有兩個回答 */}
            {explainations.length > 0 && (
              <div className="mb-4 border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-amber-700 mb-1">
                  問句：
                </p>
                <p className="text-gray-900 font-medium leading-relaxed">
                  {explainations[explainations.length - 1]}
                </p>
              </div>
            )}

            {/* 回答區：明確標明是示範回答 */}
            {expReply.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700">
                  示範回答：
                </p>
                {expReply.map((reply, index) => (
                  <p key={index} className="text-gray-600 italic">
                    {reply}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}