// components/PictureCard.tsx
'use client'

import { useState } from 'react'

interface PictureCardProps {
  word: string
  audio: string
  uploadImg: (data: string) => Promise<void> // 👈 注意：这里必须是 Promise<void>
  imgPreview?: string
}

export default function PictureCard({ word, audio, uploadImg, imgPreview }: PictureCardProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setIsUploading(true)
      uploadImg(result)
        .then(() => {
          setIsUploading(false)
        })
        .catch((error) => {
          console.error('上传失败:', error)
          setIsUploading(false)
        })
    }
    reader.readAsDataURL(file)
  }

  const playAudio = () => {
    if (audio) {
      const audioEle = new Audio(audio)
      audioEle.play()
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.gif"
        id="selectImage"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="selectImage"
        className="relative w-40 h-40 cursor-pointer overflow-hidden rounded-lg mb-3"
      >
        <img
          src={imgPreview}
          alt="preview"
          className="w-full h-full object-cover"
        />
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white text-sm">正在分析中...</span>
          </div>
        )}
      </label>

      <div className="text-white font-bold text-lg">{word}</div>

      {audio && (
        <button
          onClick={playAudio}
          className="mt-2 text-white hover:text-blue-300 transition-colors"
          aria-label="Play audio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      )}
    </div>
  )
}