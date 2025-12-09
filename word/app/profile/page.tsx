 'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

interface PetOutfitHistory {
  id: number
  resultImageUrl: string | null
  createdAt: string
}

export default function Profile() {
  const router = useRouter()
  const [history, setHistory] = useState<PetOutfitHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeScore, setActiveScore] = useState<number>(0)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/pet-outfit/history')
        if (res.ok) {
          const data = await res.json()
          setHistory(data)
        }
      } catch (e) {
        console.error('load history failed', e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/user/me')
        if (res.ok) {
          const data = await res.json()
          if (typeof data.activeScore === 'number') {
            setActiveScore(data.activeScore)
          }
        }
      } catch (e) {
        console.error('load user info failed', e)
      }
    }
    fetchMe()
  }, [])

  const latestImage = useMemo(
    () => history.find((h) => h.resultImageUrl)?.resultImageUrl || '',
    [history]
  )

  const latestTime = useMemo(() => {
    const ts = history[0]?.createdAt
    if (!ts) return '暂无记录'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '暂无记录'
    return d.toLocaleString()
  }, [history])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-8">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg border border-slate-200 p-6 flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 via-white to-emerald-200 border border-emerald-100 shadow-inner">
            {latestImage ? (
              <img src={latestImage} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-emerald-500">
                暂无头像
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">我的</h1>
            <p className="text-sm text-slate-500 mt-1">最近一次生成：{latestTime}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/pet_outfit')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700"
            >
              去生成
            </button>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              上传素材
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <p className="text-sm text-slate-500">历史生成</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{history.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <p className="text-sm text-slate-500">最新形象</p>
            <p className="text-sm text-slate-700 mt-1 truncate">{latestImage ? '已生成' : '暂无'}</p>
          </div>
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4">
            <p className="text-sm text-slate-500">活跃度</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{activeScore}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">历史形象</h2>
            <button
              onClick={() => router.push('/pet_outfit')}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              去生成新的 &rarr;
            </button>
          </div>
          {history.filter((h) => h.resultImageUrl).length === 0 && (
            <div className="text-center text-slate-400 text-sm py-6">暂无历史记录</div>
          )}
          {history.filter((h) => h.resultImageUrl).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {history
                .filter((h) => h.resultImageUrl)
                .map((item) => (
                  <div
                    key={item.id}
                    className="aspect-square overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img
                      src={item.resultImageUrl as string}
                      alt="历史形象"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}