import { z } from 'zod'

export const iconKeys = [
  'leaf',
  'scroll',
  'bracket',
  'guide',
  'tags',
  'users',
  'trophy',
  'controller',
] as const

export const toneValues = ['sage', 'mint', 'wheat', 'sky', 'moss', 'peach'] as const

const navItemSchema = z.object({
  id: z.string().uuid(),
  href: z.string().min(1, 'href is required'),
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1, 'description is required'),
  icon: z.enum(iconKeys),
  tone: z.enum(toneValues),
  sortOrder: z.number(),
  isVisible: z.boolean(),
})

const navGroupSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'title is required'),
  sortOrder: z.number(),
  isVisible: z.boolean(),
  items: z.array(navItemSchema),
})

const megaMenuSchema = z.object({
  id: z.string().min(1, 'id is required'),
  label: z.string().min(1, 'label is required'),
  sortOrder: z.number(),
  isVisible: z.boolean(),
  groups: z.array(navGroupSchema),
})

const primaryLinkSchema = z.object({
  id: z.string().uuid(),
  href: z.string().min(1, 'href is required'),
  label: z.string().min(1, 'label is required'),
  icon: z.string().min(1, 'icon is required'),
  sortOrder: z.number(),
  isVisible: z.boolean(),
})

export const navConfigSchema = z.object({
  primaryLinks: z.array(primaryLinkSchema),
  megaMenus: z.array(megaMenuSchema),
})

export type NavConfig = z.infer<typeof navConfigSchema>
