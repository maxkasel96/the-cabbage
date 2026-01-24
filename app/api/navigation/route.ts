import { NextResponse } from 'next/server'
import { getNavConfig } from '@/lib/navigation/getNavConfig'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'main'
  const config = await getNavConfig(name)

  return NextResponse.json({ name, config })
}
