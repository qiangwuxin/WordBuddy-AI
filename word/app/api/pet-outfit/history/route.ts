import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyToken } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication directly in API route
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let userId: string | null = null

    // Try access token first
    if (accessToken) {
      const payload = await verifyToken(accessToken)
      if (payload && payload.userId) {
        userId = payload.userId.toString()
      }
    }

    // If access token invalid, try refresh token
    if (!userId && refreshToken) {
      const payload = await verifyToken(refreshToken)
      if (payload && payload.userId) {
        userId = payload.userId.toString()
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let petOutfits
    try {
      petOutfits = await prisma.petOutfit.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20, // Limit to last 20 records
      })
    } catch (dbError: any) {
      console.error('Database error in history:', dbError)
      // If schema not updated, return empty array instead of error
      if (dbError.message?.includes('Unknown column') || dbError.code === 'P2001') {
        return NextResponse.json([])
      }
      throw dbError
    }

    return NextResponse.json(petOutfits)
  } catch (error: any) {
    console.error('Get history error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

