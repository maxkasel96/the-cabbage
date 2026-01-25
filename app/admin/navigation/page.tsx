'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Nav from '@/app/components/Nav'
import AdminSubNav from '@/app/components/AdminSubNav'
import PageTitle from '@/app/components/PageTitle'
import { defaultNavConfig } from '@/lib/navigation/defaultConfig'
import type { NavConfig } from '@/lib/navigation/schema'
import { iconKeys, toneValues } from '@/lib/navigation/schema'

type SelectedNode =
  | { type: 'primary'; id: string }
  | { type: 'menu'; id: string }
  | { type: 'group'; menuId: string; id: string }
  | { type: 'item'; menuId: string; groupId: string; id: string }
  | null

const getSupabaseAccessToken = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) {
      continue
    }
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as { access_token?: string }
      if (parsed.access_token) {
        return parsed.access_token
      }
    } catch {
      continue
    }
  }

  return null
}

const getAuthHeaders = (): HeadersInit => {
  const token = getSupabaseAccessToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const editorSchema = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  href: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tone: z.string().optional(),
  isVisible: z.boolean().optional(),
})

type EditorValues = z.infer<typeof editorSchema>

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(16).slice(2)}`
}

const normalizeSortOrder = <T extends { sortOrder: number }>(items: T[]) =>
  items.map((item, index) => ({ ...item, sortOrder: index + 1 }))

const cloneConfig = (config: NavConfig): NavConfig =>
  JSON.parse(JSON.stringify(config)) as NavConfig

const SortableRow = ({
  id,
  data,
  children,
  onClick,
}: {
  id: string
  data: Record<string, unknown>
  children: ReactNode
  onClick?: () => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface)',
        marginBottom: 6,
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

const GroupDropZone = ({
  id,
  menuId,
  groupId,
  children,
}: {
  id: string
  menuId: string
  groupId: string
  children: ReactNode
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'group-drop', menuId, groupId },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: 8,
        borderRadius: 8,
        border: `1px dashed ${isOver ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        background: isOver ? 'rgba(148, 163, 184, 0.15)' : 'transparent',
      }}
    >
      {children}
    </div>
  )
}

export default function NavigationBuilderPage() {
  const [config, setConfig] = useState<NavConfig>(defaultNavConfig)
  const [initialConfig, setInitialConfig] = useState<NavConfig>(defaultNavConfig)
  const [selected, setSelected] = useState<SelectedNode>(null)
  const [status, setStatus] = useState<string>('')
  const [toast, setToast] = useState<string>('')

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const { register, handleSubmit, reset } = useForm<EditorValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {},
  })

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      setStatus('Loading navigation...')
      const res = await fetch('/api/admin/navigation?name=main', {
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => null)

      if (!isMounted) return

      if (!res.ok) {
        setStatus(json?.error || 'Failed to load navigation configuration.')
        return
      }

      setConfig(json.config ?? defaultNavConfig)
      setInitialConfig(json.config ?? defaultNavConfig)
      setStatus(json?.warning ?? '')
    }

    loadConfig()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(initialConfig),
    [config, initialConfig]
  )

  useEffect(() => {
    if (!selected) {
      reset({})
      return
    }

    if (selected.type === 'primary') {
      const link = config.primaryLinks.find((item) => item.id === selected.id)
      if (!link) {
        reset({})
        return
      }
      reset({
        label: link.label,
        href: link.href,
        icon: link.icon,
        isVisible: link.isVisible,
      })
      return
    }

    if (selected.type === 'menu') {
      const menu = config.megaMenus.find((item) => item.id === selected.id)
      if (!menu) {
        reset({})
        return
      }
      reset({
        label: menu.label,
        isVisible: menu.isVisible,
      })
      return
    }

    if (selected.type === 'group') {
      const menu = config.megaMenus.find((item) => item.id === selected.menuId)
      const group = menu?.groups.find((item) => item.id === selected.id)
      if (!group) {
        reset({})
        return
      }
      reset({
        title: group.title,
        isVisible: group.isVisible,
      })
      return
    }

    if (selected.type === 'item') {
      const menu = config.megaMenus.find((item) => item.id === selected.menuId)
      const group = menu?.groups.find((item) => item.id === selected.groupId)
      const item = group?.items.find((entry) => entry.id === selected.id)
      if (!item) {
        reset({})
        return
      }
      reset({
        title: item.title,
        description: item.description,
        href: item.href,
        icon: item.icon,
        tone: item.tone,
        isVisible: item.isVisible,
      })
    }
  }, [config, reset, selected])

  const handleSaveEditor = handleSubmit((values) => {
    if (!selected) return
    setConfig((prev) => {
      const next = cloneConfig(prev)
      if (selected.type === 'primary') {
        const link = next.primaryLinks.find((item) => item.id === selected.id)
        if (!link) return prev
        link.label = values.label ?? link.label
        link.href = values.href ?? link.href
        link.icon = values.icon ?? link.icon
        link.isVisible = values.isVisible ?? link.isVisible
        return next
      }
      if (selected.type === 'menu') {
        const menu = next.megaMenus.find((item) => item.id === selected.id)
        if (!menu) return prev
        menu.label = values.label ?? menu.label
        menu.isVisible = values.isVisible ?? menu.isVisible
        return next
      }
      if (selected.type === 'group') {
        const menu = next.megaMenus.find((item) => item.id === selected.menuId)
        const group = menu?.groups.find((item) => item.id === selected.id)
        if (!group) return prev
        group.title = values.title ?? group.title
        group.isVisible = values.isVisible ?? group.isVisible
        return next
      }
      if (selected.type === 'item') {
        const menu = next.megaMenus.find((item) => item.id === selected.menuId)
        const group = menu?.groups.find((item) => item.id === selected.groupId)
        const item = group?.items.find((i) => i.id === selected.id)
        if (!item) return prev
        item.title = values.title ?? item.title
        item.description = values.description ?? item.description
        item.href = values.href ?? item.href
        item.icon = (values.icon as typeof item.icon) ?? item.icon
        item.tone = (values.tone as typeof item.tone) ?? item.tone
        item.isVisible = values.isVisible ?? item.isVisible
        return next
      }
      return prev
    })
    setToast('Updated selection.')
  })

  const addPrimaryLink = () => {
    const id = createId()
    setConfig((prev) => ({
      ...prev,
      primaryLinks: normalizeSortOrder([
        ...prev.primaryLinks,
        {
          id,
          href: '/new-link',
          label: 'New link',
          icon: '✨',
          sortOrder: prev.primaryLinks.length + 1,
          isVisible: true,
        },
      ]),
    }))
    setSelected({ type: 'primary', id })
  }

  const addMegaMenu = () => {
    const id = createId()
    setConfig((prev) => ({
      ...prev,
      megaMenus: normalizeSortOrder([
        ...prev.megaMenus,
        {
          id,
          label: 'New menu',
          sortOrder: prev.megaMenus.length + 1,
          isVisible: true,
          groups: [],
        },
      ]),
    }))
    setSelected({ type: 'menu', id })
  }

  const addGroup = (menuId: string) => {
    const id = createId()
    setConfig((prev) => {
      const next = cloneConfig(prev)
      const menu = next.megaMenus.find((item) => item.id === menuId)
      if (!menu) return prev
      menu.groups = normalizeSortOrder([
        ...menu.groups,
        {
          id,
          title: 'New group',
          sortOrder: menu.groups.length + 1,
          isVisible: true,
          items: [],
        },
      ])
      return next
    })
    setSelected({ type: 'group', menuId, id })
  }

  const addItem = (menuId: string, groupId: string) => {
    const id = createId()
    setConfig((prev) => {
      const next = cloneConfig(prev)
      const menu = next.megaMenus.find((item) => item.id === menuId)
      const group = menu?.groups.find((item) => item.id === groupId)
      if (!group) return prev
      group.items = normalizeSortOrder([
        ...group.items,
        {
          id,
          href: '/admin/new-item',
          title: 'New item',
          description: 'Describe this destination.',
          icon: 'guide',
          tone: 'sage',
          sortOrder: group.items.length + 1,
          isVisible: true,
        },
      ])
      return next
    })
    setSelected({ type: 'item', menuId, groupId, id })
  }

  const confirmDelete = (message: string) => {
    return window.confirm(message)
  }

  const deleteNode = (node: SelectedNode) => {
    if (!node) return
    setConfig((prev) => {
      const next = cloneConfig(prev)
      if (node.type === 'primary') {
        next.primaryLinks = normalizeSortOrder(
          next.primaryLinks.filter((link) => link.id !== node.id)
        )
        return next
      }
      if (node.type === 'menu') {
        const menu = next.megaMenus.find((m) => m.id === node.id)
        if (menu && menu.groups.length > 0) {
          const ok = confirmDelete('Delete this mega menu and all of its groups/items?')
          if (!ok) return prev
        }
        next.megaMenus = normalizeSortOrder(
          next.megaMenus.filter((menuItem) => menuItem.id !== node.id)
        )
        return next
      }
      if (node.type === 'group') {
        const menu = next.megaMenus.find((m) => m.id === node.menuId)
        const group = menu?.groups.find((g) => g.id === node.id)
        if (group && group.items.length > 0) {
          const ok = confirmDelete('Delete this group and all of its items?')
          if (!ok) return prev
        }
        if (menu) {
          menu.groups = normalizeSortOrder(
            menu.groups.filter((groupItem) => groupItem.id !== node.id)
          )
        }
        return next
      }
      if (node.type === 'item') {
        const menu = next.megaMenus.find((m) => m.id === node.menuId)
        const group = menu?.groups.find((g) => g.id === node.groupId)
        if (group) {
          group.items = normalizeSortOrder(
            group.items.filter((item) => item.id !== node.id)
          )
        }
        return next
      }
      return prev
    })
    setSelected(null)
  }

  const handleSave = async () => {
    setStatus('Saving...')
    const res = await fetch('/api/admin/navigation?name=main', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(config),
    })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setStatus(json?.error || 'Failed to save navigation.')
      return
    }

    setInitialConfig(config)
    setStatus('')
    setToast('Navigation saved.')
  }

  const handleReset = () => {
    setConfig(initialConfig)
    setSelected(null)
    setToast('Reverted changes.')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === 'primary' && overType === 'primary') {
      const activeId = active.data.current?.id as string
      const overId = over.data.current?.id as string
      setConfig((prev) => {
        const current = [...prev.primaryLinks].sort((a, b) => a.sortOrder - b.sortOrder)
        const oldIndex = current.findIndex((link) => link.id === activeId)
        const newIndex = current.findIndex((link) => link.id === overId)
        const reordered = arrayMove(current, oldIndex, newIndex)
        return { ...prev, primaryLinks: normalizeSortOrder(reordered) }
      })
      return
    }

    if (activeType === 'menu' && overType === 'menu') {
      const activeId = active.data.current?.id as string
      const overId = over.data.current?.id as string
      setConfig((prev) => {
        const current = [...prev.megaMenus].sort((a, b) => a.sortOrder - b.sortOrder)
        const oldIndex = current.findIndex((menu) => menu.id === activeId)
        const newIndex = current.findIndex((menu) => menu.id === overId)
        const reordered = arrayMove(current, oldIndex, newIndex)
        return { ...prev, megaMenus: normalizeSortOrder(reordered) }
      })
      return
    }

    if (activeType === 'group' && overType === 'group') {
      const activeId = active.data.current?.id as string
      const overId = over.data.current?.id as string
      const menuId = active.data.current?.menuId as string
      const overMenuId = over.data.current?.menuId as string
      if (menuId !== overMenuId) return

      setConfig((prev) => {
        const next = cloneConfig(prev)
        const menu = next.megaMenus.find((m) => m.id === menuId)
        if (!menu) return prev
        const current = [...menu.groups].sort((a, b) => a.sortOrder - b.sortOrder)
        const oldIndex = current.findIndex((group) => group.id === activeId)
        const newIndex = current.findIndex((group) => group.id === overId)
        menu.groups = normalizeSortOrder(arrayMove(current, oldIndex, newIndex))
        return next
      })
      return
    }

    if (activeType === 'item') {
      const activeMenuId = active.data.current?.menuId as string
      const activeGroupId = active.data.current?.groupId as string
      const activeItemId = active.data.current?.id as string

      let targetMenuId = activeMenuId
      let targetGroupId = activeGroupId
      let targetIndex: number | null = null

      if (overType === 'item') {
        targetMenuId = over.data.current?.menuId as string
        targetGroupId = over.data.current?.groupId as string
        targetIndex = over.data.current?.index as number
      }

      if (overType === 'group-drop') {
        targetMenuId = over.data.current?.menuId as string
        targetGroupId = over.data.current?.groupId as string
        targetIndex = null
      }

      setConfig((prev) => {
        const next = cloneConfig(prev)
        const sourceMenu = next.megaMenus.find((menu) => menu.id === activeMenuId)
        const sourceGroup = sourceMenu?.groups.find((group) => group.id === activeGroupId)
        const item = sourceGroup?.items.find((i) => i.id === activeItemId)
        if (!sourceGroup || !item) return prev

        if (
          overType === 'item' &&
          targetMenuId === activeMenuId &&
          targetGroupId === activeGroupId
        ) {
          const currentItems = [...sourceGroup.items].sort((a, b) => a.sortOrder - b.sortOrder)
          const oldIndex = currentItems.findIndex((i) => i.id === activeItemId)
          const newIndex = currentItems.findIndex(
            (i) => i.id === over.data.current?.id
          )
          sourceGroup.items = normalizeSortOrder(arrayMove(currentItems, oldIndex, newIndex))
          return next
        }

        sourceGroup.items = sourceGroup.items.filter((i) => i.id !== activeItemId)

        const targetMenu = next.megaMenus.find((menu) => menu.id === targetMenuId)
        const targetGroup = targetMenu?.groups.find((group) => group.id === targetGroupId)
        if (!targetGroup) return prev

        const insertIndex =
          targetIndex === null
            ? targetGroup.items.length
            : targetGroup.items.findIndex((i) => i.id === item.id) === -1
              ? targetIndex
              : targetGroup.items.length

        targetGroup.items.splice(insertIndex, 0, item)

        sourceGroup.items = normalizeSortOrder(sourceGroup.items)
        targetGroup.items = normalizeSortOrder(targetGroup.items)

        return next
      })
    }
  }

  const primaryItems = useMemo(
    () => [...config.primaryLinks].sort((a, b) => a.sortOrder - b.sortOrder),
    [config.primaryLinks]
  )
  const megaMenus = useMemo(
    () => [...config.megaMenus].sort((a, b) => a.sortOrder - b.sortOrder),
    [config.megaMenus]
  )

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: 'var(--page-background)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      <div className="pageShell">
        <div className="stickyHeader">
          <Nav />
        </div>
        <PageTitle>Admin: Navigation Builder</PageTitle>
        <AdminSubNav />

        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <button onClick={handleSave} disabled={!isDirty} style={{ padding: '8px 12px' }}>
            Save
          </button>
          <button onClick={handleReset} disabled={!isDirty} style={{ padding: '8px 12px' }}>
            Reset
          </button>
          <span style={{ fontWeight: 600 }}>{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
          {status && <span>{status}</span>}
          {toast && (
            <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-muted)' }}>
              {toast}
            </span>
          )}
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.1fr)',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <div>
              <section
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Primary Links</h3>
                  <button onClick={addPrimaryLink} style={{ padding: '6px 10px' }}>
                    Add link
                  </button>
                </div>
                <SortableContext
                  items={primaryItems.map((item) => `primary:${item.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ marginTop: 10 }}>
                    {primaryItems.map((link) => (
                      <SortableRow
                        key={link.id}
                        id={`primary:${link.id}`}
                        data={{ type: 'primary', id: link.id }}
                        onClick={() => setSelected({ type: 'primary', id: link.id })}
                      >
                        <span>{link.icon}</span>
                        <span style={{ fontWeight: 600 }}>{link.label}</span>
                        {!link.isVisible && <span style={{ color: 'var(--text-muted)' }}>(Hidden)</span>}
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelected({ type: 'primary', id: link.id })
                            deleteNode({ type: 'primary', id: link.id })
                          }}
                          style={{ marginLeft: 'auto' }}
                        >
                          Delete
                        </button>
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </section>

              <section
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  padding: 12,
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Mega Menus</h3>
                  <button onClick={addMegaMenu} style={{ padding: '6px 10px' }}>
                    Add menu
                  </button>
                </div>
                <SortableContext
                  items={megaMenus.map((menu) => `menu:${menu.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ marginTop: 10 }}>
                    {megaMenus.map((menu) => (
                      <div key={menu.id} style={{ marginBottom: 12 }}>
                        <SortableRow
                          id={`menu:${menu.id}`}
                          data={{ type: 'menu', id: menu.id }}
                          onClick={() => setSelected({ type: 'menu', id: menu.id })}
                        >
                          <strong>{menu.label}</strong>
                          {!menu.isVisible && <span style={{ color: 'var(--text-muted)' }}>(Hidden)</span>}
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              addGroup(menu.id)
                            }}
                            style={{ marginLeft: 'auto' }}
                          >
                            Add group
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              deleteNode({ type: 'menu', id: menu.id })
                            }}
                          >
                            Delete
                          </button>
                        </SortableRow>

                        <SortableContext
                          items={menu.groups
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((group) => `group:${menu.id}:${group.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div style={{ marginLeft: 16 }}>
                            {menu.groups
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((group) => (
                                <div key={group.id} style={{ marginBottom: 10 }}>
                                  <SortableRow
                                    id={`group:${menu.id}:${group.id}`}
                                    data={{ type: 'group', id: group.id, menuId: menu.id }}
                                    onClick={() =>
                                      setSelected({ type: 'group', menuId: menu.id, id: group.id })
                                    }
                                  >
                                    <span>{group.title}</span>
                                    {!group.isVisible && (
                                      <span style={{ color: 'var(--text-muted)' }}>(Hidden)</span>
                                    )}
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        addItem(menu.id, group.id)
                                      }}
                                      style={{ marginLeft: 'auto' }}
                                    >
                                      Add item
                                    </button>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        deleteNode({ type: 'group', menuId: menu.id, id: group.id })
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </SortableRow>

                                  <GroupDropZone
                                    id={`group-drop:${menu.id}:${group.id}`}
                                    menuId={menu.id}
                                    groupId={group.id}
                                  >
                                    <SortableContext
                                      items={group.items
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((item) => `item:${menu.id}:${group.id}:${item.id}`)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <div style={{ marginLeft: 16, marginTop: 6 }}>
                                        {group.items
                                          .sort((a, b) => a.sortOrder - b.sortOrder)
                                          .map((item, index) => (
                                            <SortableRow
                                              key={item.id}
                                              id={`item:${menu.id}:${group.id}:${item.id}`}
                                              data={{
                                                type: 'item',
                                                id: item.id,
                                                menuId: menu.id,
                                                groupId: group.id,
                                                index,
                                              }}
                                              onClick={() =>
                                                setSelected({
                                                  type: 'item',
                                                  menuId: menu.id,
                                                  groupId: group.id,
                                                  id: item.id,
                                                })
                                              }
                                            >
                                              <span>{item.title}</span>
                                              {!item.isVisible && (
                                                <span style={{ color: 'var(--text-muted)' }}>(Hidden)</span>
                                              )}
                                              <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                                                {item.icon}
                                              </span>
                                              <button
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  deleteNode({
                                                    type: 'item',
                                                    menuId: menu.id,
                                                    groupId: group.id,
                                                    id: item.id,
                                                  })
                                                }}
                                              >
                                                Delete
                                              </button>
                                            </SortableRow>
                                          ))}
                                      </div>
                                    </SortableContext>
                                  </GroupDropZone>
                                </div>
                              ))}
                          </div>
                        </SortableContext>
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </section>
            </div>

            <div>
              <section
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  padding: 14,
                  background: 'var(--surface)',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Details</h3>
                {!selected ? (
                  <p>Select a link, menu, group, or item to edit its details.</p>
                ) : (
                  <form onSubmit={handleSaveEditor} style={{ display: 'grid', gap: 10 }}>
                    {(selected.type === 'primary' || selected.type === 'menu') && (
                      <label style={{ display: 'grid', gap: 6 }}>
                        Label
                        <input {...register('label')} style={{ padding: 8 }} />
                      </label>
                    )}
                    {selected.type === 'primary' && (
                      <>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Href
                          <input {...register('href')} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Emoji icon
                          <input {...register('icon')} style={{ padding: 8 }} />
                        </label>
                      </>
                    )}
                    {selected.type === 'group' && (
                      <label style={{ display: 'grid', gap: 6 }}>
                        Group title
                        <input {...register('title')} style={{ padding: 8 }} />
                      </label>
                    )}
                    {selected.type === 'item' && (
                      <>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Item title
                          <input {...register('title')} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Description
                          <textarea {...register('description')} style={{ padding: 8 }} rows={3} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Href
                          <input {...register('href')} style={{ padding: 8 }} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Icon
                          <select {...register('icon')} style={{ padding: 8 }}>
                            {iconKeys.map((key) => (
                              <option key={key} value={key}>
                                {key}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          Tone
                          <select {...register('tone')} style={{ padding: 8 }}>
                            {toneValues.map((tone) => (
                              <option key={tone} value={tone}>
                                {tone}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" {...register('isVisible')} />
                      Visible in navigation
                    </label>
                    <button type="submit" style={{ padding: '8px 12px', width: 'fit-content' }}>
                      Update
                    </button>
                  </form>
                )}
              </section>

              <section
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  padding: 14,
                  background: 'var(--surface)',
                }}
              >
                <h3 style={{ marginTop: 0 }}>Preview JSON</h3>
                <pre
                  style={{
                    maxHeight: 360,
                    overflow: 'auto',
                    background: 'var(--surface-muted)',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(config, null, 2)}
                </pre>
              </section>
            </div>
          </div>
        </DndContext>
      </div>
    </main>
  )
}
