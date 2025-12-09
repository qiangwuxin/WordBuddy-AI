'use client'

import { useState, useEffect } from 'react'
import BottomNav from '../components/BottomNav'

interface PetOutfitHistory {
  id: number
  originalImageUrl: string
  resultImageUrl: string | null
  jerseyColor: string
  jerseyNumber: number
  style: string
  position: number
  shootingHand: number | null
  createdAt: string
}

export default function PetOutfit() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [style, setStyle] = useState('写实')
  const [uniformNumber, setUniformNumber] = useState(10)
  const [uniformColor, setUniformColor] = useState('红色')
  const [position, setPosition] = useState(1) // 1=守门员, 2=防守队员, 3=前锋
  const [shootingHand, setShootingHand] = useState<number | null>(null) // null=随机
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<PetOutfitHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/pet-outfit/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
        // 默认展示最新历史作为当前形象
        const latest = data.find((item: PetOutfitHistory) => item.resultImageUrl)
        if (latest?.resultImageUrl) {
          setGeneratedImage(latest.resultImageUrl)
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError('请先上传宠物图片')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedImage('')

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Image = reader.result as string

        const res = await fetch('/api/pet-outfit/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64Image,
            style,
            uniformNumber,
            uniformColor,
            position,
            shootingHand: shootingHand ?? Math.floor(Math.random() * 2), // 随机选择如果为null
          }),
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || '生成失败')
        }

        const data = await res.json()
        setGeneratedImage(data.resultImageUrl)
        await loadHistory() // Refresh history
      }
      reader.readAsDataURL(selectedImage)
    } catch (err: any) {
      setError(err.message || '生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const positionOptions = [
    { value: 1, label: '守门员' },
    { value: 2, label: '防守队员' },
    { value: 3, label: '前锋' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-28 relative">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            宠物装扮
          </h1>
          <span className="text-sm text-slate-500">AI 形象生成</span>
        </div>

        {/* 主展示区域 */}
        <div className="bg-white/70 backdrop-blur rounded-3xl shadow-xl border border-slate-200 p-6">
          <div className="aspect-[4/5] w-full max-w-2xl mx-auto border-4 border-black rounded-2xl overflow-hidden bg-slate-900/5 flex items-center justify-center">
            {generatedImage || imagePreview ? (
              <img
                src={generatedImage || imagePreview}
                alt="当前形象"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-slate-400 text-sm">上传或生成后显示形象</div>
            )}
          </div>

          {/* 控件区 */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <button
          onClick={() => {
            setShowForm(true)
            document.getElementById('regenerate-form')?.scrollIntoView({ behavior: 'smooth' })
          }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              重新生成形象
            </button>
          </div>
        </div>

        {/* 表单卡片 */}
        {showForm && (
          <div
            id="regenerate-form"
            className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 space-y-4"
          >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">上传 & 参数</h2>
            <span className="text-xs text-slate-400">确保图片清晰，便于生成</span>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm text-slate-700">上传宠物图片</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </label>

            {imagePreview && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={imagePreview} alt="预览" className="w-full h-64 object-cover" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm text-slate-700">风格</span>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="写实 / 卡通 / 动漫"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm text-slate-700">球衣号码</span>
                <input
                  type="number"
                  value={uniformNumber}
                  onChange={(e) => setUniformNumber(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="1"
                  max="99"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm text-slate-700">球衣颜色</span>
                <input
                  type="text"
                  value={uniformColor}
                  onChange={(e) => setUniformColor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="红 / 蓝 / 绿 / 黄 / 白 / 黑"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm text-slate-700">位置</span>
                <select
                  value={position}
                  onChange={(e) => setPosition(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {positionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-slate-700">持杆手</span>
                <select
                  value={shootingHand === null ? 'random' : shootingHand.toString()}
                  onChange={(e) =>
                    setShootingHand(
                      e.target.value === 'random' ? null : parseInt(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="random">随机</option>
                  <option value="0">左手</option>
                  <option value="1">右手</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !selectedImage}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? '生成中...' : '开始生成'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* 底部历史抽屉 */}
      <div className="fixed inset-x-0 bottom-16 z-40">
        <div className="mx-auto max-w-4xl px-4 pb-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mx-auto block rounded-t-xl rounded-b-lg bg-gradient-to-r from-rose-500 to-red-500 text-white px-6 py-2 shadow-lg"
          >
            {showHistory ? '收起历史' : '历史形象'}
          </button>

          <div
            className={`mt-2 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl transition-all duration-300 ${
              showHistory ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-4'
            }`}
          >
            {history.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">暂无历史记录</div>
            )}
            {history.length > 0 && (
              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {history.map(
                  (item) =>
                    item.resultImageUrl && (
                      <div
                        key={item.id}
                        className="aspect-square overflow-hidden rounded-xl border border-slate-200"
                      >
                        <img
                          src={item.resultImageUrl}
                          alt="历史形象"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
