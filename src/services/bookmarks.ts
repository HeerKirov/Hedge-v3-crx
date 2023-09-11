import { useState } from "react"
import { databases } from "@/functions/database"
import { BookmarkModel, GroupModel, Page, PageReferenceModel } from "@/functions/database/model"
import { Result, numbers, objects } from "@/utils/primitives"
import { useAsyncLoading } from "@/utils/reactivity"

export function tabCreated(tab: chrome.tabs.Tab) {
    
}

export function tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {

}

export function useBookmarkList() {
    const [bookmarkList, setBookmarkList] = useAsyncLoading(async () => {
        return await bookmarks.queryBookmarks()
    })
    const [errorMessage, setErrorMessage] = useState<{error: "URL_ALREADY_EXISTS"} | null>(null)

    const clearErrorMessage = () => setErrorMessage(null)

    const addBookmark = async (form: BookmarkForm): Promise<boolean> => {
        if(bookmarkList) {
            const res = await bookmarks.addBookmark(form)
            setBookmarkList([...bookmarkList, res])
            return true
        }
        return false
    }

    const updateBookmark = async (index: number, form: BookmarkForm) => {
        if(bookmarkList && index >= 0 && index < bookmarkList.length) {
            const old = bookmarkList[index]
            const res = await bookmarks.updateBookmark(old.bookmarkId, form)
            if(res.ok) {
                setBookmarkList([...bookmarkList.slice(0, index), res.value, ...bookmarkList.slice(index + 1)])
            }
        }
    }

    const deleteBookmark = async (index: number) => {
        if(bookmarkList && index >= 0 && index < bookmarkList.length) {
            const b = bookmarkList[index]
            const res = await bookmarks.deleteBookmark(b.bookmarkId)
            if(res.ok) {
                setBookmarkList([...bookmarkList.slice(0, index), ...bookmarkList.slice(index + 1)])
            }
        }
    }

    const addPage = async (index: number, pageIndex: number | null, page: PageForm): Promise<boolean> => {
        if(bookmarkList && index >= 0 && index < bookmarkList.length) {
            const b = bookmarkList[index]
            const res = await bookmarks.addPage(b.bookmarkId, pageIndex, page)
            if(res.ok) {
                setBookmarkList([
                    ...bookmarkList.slice(0, index), 
                    {
                        ...b,
                        pages: pageIndex !== null ? [...b.pages.slice(0, pageIndex), res.value, ...b.pages.slice(pageIndex)] : [...b.pages, res.value]
                    }, 
                    ...bookmarkList.slice(index + 1)
                ])
                if(errorMessage !== null) setErrorMessage(null)
                return true
            }else if(res.err === "URL_ALREADY_EXISTS") {
                setErrorMessage({error: res.err})
            }
        }
        return false
    }

    const updatePage = async (index: number, pageIndex: number, page: PageForm) => {
        if(bookmarkList && index >= 0 && index < bookmarkList.length) {
            const b = bookmarkList[index]
            const p = b.pages[pageIndex]
            const res = await bookmarks.updatePage(b.bookmarkId, p.pageId, page)
            if(res.ok) {
                setBookmarkList([
                    ...bookmarkList.slice(0, index), 
                    {
                        ...b,
                        pages: [...b.pages.slice(0, pageIndex), res.value, ...b.pages.slice(pageIndex + 1)]
                    }, 
                    ...bookmarkList.slice(index + 1)
                ])
                if(errorMessage !== null) setErrorMessage(null)
            }else if(res.err === "URL_ALREADY_EXISTS") {
                setErrorMessage({error: res.err})
            }
        }
    }

    const movePage = async (index: number, pageIndex: number, moveToIndex: number, moveToPageIndex: number | null) => {
        if((index !== moveToIndex || pageIndex !== moveToPageIndex) && bookmarkList && index >= 0 && index < bookmarkList.length && moveToIndex >= 0 && moveToIndex < bookmarkList.length) {
            const b = bookmarkList[index]
            const p = b.pages[pageIndex]
            const toB = bookmarkList[moveToIndex]
            const res = await bookmarks.movePage(b.bookmarkId, p.pageId, toB.bookmarkId, moveToPageIndex)
            if(res.ok) {
                if(moveToIndex > index) {
                    setBookmarkList([
                        ...bookmarkList.slice(0, index),
                        res.value.origin,
                        ...bookmarkList.slice(index + 1, moveToIndex),
                        res.value.target,
                        ...bookmarkList.slice(moveToIndex + 1)
                    ])
                }else if(moveToIndex < index) {
                    setBookmarkList([
                        ...bookmarkList.slice(0, moveToIndex),
                        res.value.target,
                        ...bookmarkList.slice(moveToIndex + 1, index),
                        res.value.origin,
                        ...bookmarkList.slice(index + 1)
                    ])
                }else{
                    setBookmarkList([
                        ...bookmarkList.slice(0, index),
                        res.value.target,
                        ...bookmarkList.slice(index + 1)
                    ])
                }
            }
        }
    }

    const deletePage = async (index: number, pageIndex: number) => {
        if(bookmarkList && index >= 0 && index < bookmarkList.length) {
            const b = bookmarkList[index]
            const p = b.pages[pageIndex]
            const res = await bookmarks.deletePage(b.bookmarkId, p.pageId)
            if(res.ok) {
                setBookmarkList([
                    ...bookmarkList.slice(0, index), 
                    {
                        ...b,
                        pages: [...b.pages.slice(0, pageIndex), ...b.pages.slice(pageIndex + 1)]
                    },
                    ...bookmarkList.slice(index + 1)
                ])
            }
        }
    }

    return {bookmarkList, addBookmark, updateBookmark, deleteBookmark, addPage, updatePage, movePage, deletePage, errorMessage, clearErrorMessage}
}

export function useGroupList() {
    const [groupList, setGroupList] = useAsyncLoading(bookmarks.getGroups)
    const [errorMessage, setErrorMessage] = useState<{keyPath: string | null, error: "ALREADY_EXISTS" | "ITEM_OCCUPIED" | "GROUP_OCCUPIED"} | null>(null)

    const clearErrorMessage = () => setErrorMessage(null)

    const addGroup = async (form: GroupModel): Promise<boolean> => {
        const res = await bookmarks.addGroup(form)
        if(res.ok) {
            setGroupList([...(groupList ?? []), res.value])
            if(errorMessage !== null) setErrorMessage(null)
            return true
        }else if(res.err === "ALREADY_EXISTS") {
            setErrorMessage({keyPath: null, error: res.err})
        }
        return false
    }

    const updateGroup = async (index: number, form: GroupModel) => {
        if(groupList && index >= 0 && index < groupList.length) {
            const old = groupList[index]
            if(old.groupKeyPath === form.groupKeyPath) {
                const res = await bookmarks.updateGroup(form)
                if(res.ok) {
                    setGroupList([...groupList.slice(0, index), res.value, ...groupList.slice(index + 1)])
                    if(errorMessage !== null) setErrorMessage(null)
                }else if(res.err === "ITEM_OCCUPIED") {
                    setErrorMessage({keyPath: form.groupKeyPath, error: res.err})
                }
            }
        }
    }

    const deleteGroup = async (index: number) => {
        if(groupList && index >= 0 && index < groupList.length) {
            const old = groupList[index]
            const res = await bookmarks.deleteGroup(old.groupKeyPath)
            if(res.ok) {
                setGroupList([...groupList.slice(0, index), ...groupList.slice(index + 1)])
                if(errorMessage !== null) setErrorMessage(null)
            }else if(res.err === "GROUP_OCCUPIED") {
                setErrorMessage({keyPath: old.groupKeyPath, error: res.err})
            }
        }
    }

    return {groupList, addGroup, updateGroup, deleteGroup, errorMessage, clearErrorMessage}
}

export const bookmarks = {
    async queryBookmarks(filter?: QueryBookmarkFilter): Promise<BookmarkModel[]> {
        const t = await databases.transaction("bookmark", "readonly")
        return await t.cursorBookmark()
            .filter(record => {
                if(filter) {
                    if(filter.search && !(record.name.includes(filter.search) || record.otherNames.some(n => n.includes(filter.search!)) || record.pages.some(p => p.title.includes(filter.search!)))) {
                        return false
                    }
                    if(filter.groups?.length) {
                        for(const [n, k] of filter.groups) {
                            if(!(record.groups.some(([gn, gk]) => n === gn && k === gk) || record.pages.some(p => p.groups?.some(([gn, gk]) => n === gn && k === gk)))) {
                                return false
                            }
                        }
                    }
                }
                return true
            })
            .limitAndOffset(filter?.limit, filter?.offset)
            .direction(filter?.orderDirection === "desc" ? "prev" : "next")
            .order(filter?.order === "createTime" ? ((a, b) => numbers.compareTo(a.createTime.getMilliseconds(), b.createTime.getMilliseconds()))
                : filter?.order === "updateTime" ? ((a, b) => numbers.compareTo(a.updateTime.getMilliseconds(), b.updateTime.getMilliseconds()))
                : filter?.order === "lastCollectTime" ? ((a, b) => a.lastCollectTime !== undefined && b.lastCollectTime !== undefined ? numbers.compareTo(a.lastCollectTime.getMilliseconds(), b.lastCollectTime.getMilliseconds()) : a.lastCollectTime === undefined && b.lastCollectTime === undefined ? 0 : a.lastCollectTime === undefined ? -1 : 1)
                : filter?.order === "score" ? ((a, b) => a.score !== undefined && b.score !== undefined ? numbers.compareTo(a.score, b.score) : a.score === undefined && b.score === undefined ? 0 : a.score === undefined ? -1 : 1)
                : undefined)
            .toList()
    },
    async addBookmark(form: BookmarkForm): Promise<BookmarkModel> {
        const t = await databases.transaction("bookmark", "readwrite")
        const now = new Date()
        return await t.addBookmark({...form, pages: [], lastCollectTime: undefined, createTime: now, updateTime: now})
    },
    async updateBookmark(bookmarkId: number, form: BookmarkForm): Promise<Result<BookmarkModel, "NOT_FOUND">> {
        const t = await databases.transaction("bookmark", "readwrite")
        const model = await t.getBookmark(bookmarkId)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        const now = new Date()
        const res = await t.putBookmark({...model, ...form, updateTime: now})
        return {ok: true, value: res}
    },
    async deleteBookmark(bookmarkId: number): Promise<Result<undefined, "NOT_FOUND">> {
        const t = await databases.transaction("bookmark", "readwrite")
        const model = await t.getBookmark(bookmarkId)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        await t.deleteBookmark(bookmarkId)
        await Promise.all(model.pages.map(p => t.deletePageReference(p.pageId)))
        return {ok: true, value: undefined}
    },
    async queryPageByURL(url: PageReferenceModel["url"]): Promise<{bookmark: BookmarkModel, page: Page} | undefined> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readonly")
        const ref = await t.getPageReferenceByUrl(url)
        if(ref === undefined) {
            return undefined
        }
        const bookmark = await t.getBookmark(ref.bookmarkId)
        if(bookmark === undefined) {
            return undefined
        }
        const page = bookmark.pages.find(p => p.pageId === ref.pageId)
        if(page === undefined) {
            return undefined
        }
        return {bookmark, page}
    },
    async addPage(bookmarkId: number, insertPageIndex: number | null, form: PageForm): Promise<Result<Page, "BOOKMARK_NOT_FOUND" | "URL_ALREADY_EXISTS">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        if((await t.getPageReferenceByUrl(form.url)) !== undefined) {
            return {ok: false, err: "URL_ALREADY_EXISTS"}
        }
        const now = new Date()
        const pageRefModel = await t.addPageReference({url: form.url, bookmarkId: bookmarkModel.bookmarkId})
        const page: Page = {pageId: pageRefModel.pageId, ...form, host: generateHost(form.url), createTime: now, updateTime: now}
        const pages = insertPageIndex !== null ? [...bookmarkModel.pages.slice(0, insertPageIndex), page, ...bookmarkModel.pages.slice(insertPageIndex)] : [...bookmarkModel.pages, page]
        const lastCollectTime = pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre)
        await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: now})
        return {ok: true, value: page}
    },
    async updatePage(bookmarkId: number, pageId: number, form: PageForm): Promise<Result<Page, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND" | "URL_ALREADY_EXISTS">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        const pageIndex = bookmarkModel.pages.findIndex(p => p.pageId === pageId)
        if(pageIndex < 0) {
            return {ok: false, err: "PAGE_NOT_FOUND"}
        }
        const page = bookmarkModel.pages[pageIndex]
        if(form.url !== page.url && (await t.getPageReferenceByUrl(form.url)) !== undefined) {
            return {ok: false, err: "URL_ALREADY_EXISTS"}
        }
        const fieldChanged = form.title !== page.title || form.url !== page.url || form.description !== page.description || !objects.deepEquals(form.keywords, page.keywords) || !objects.deepEquals(form.groups, page.groups)
        const now = new Date()
        const newPage = {...page, ...form, host: generateHost(form.url), updateTime: fieldChanged ? now : page.updateTime}
        const pages = [...bookmarkModel.pages.slice(0, pageIndex), newPage, ...bookmarkModel.pages.slice(pageIndex + 1)]
        const lastCollectTime = form.lastCollectTime !== page.lastCollectTime ? pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre) : bookmarkModel.lastCollectTime
        await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: fieldChanged ? now : bookmarkModel.updateTime})
        if(newPage.url !== page.url) {
            await t.putPageReference({pageId, bookmarkId, url: newPage.url})
        }
        return {ok: true, value: newPage}
    },
    async movePage(bookmarkId: number, pageId: number, moveToBookmark: number, moveToIndex: number | null): Promise<Result<{origin: BookmarkModel, target: BookmarkModel}, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND" | "TARGET_BOOKMARK_NOT_FOUND">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        const pageIndex = bookmarkModel.pages.findIndex(p => p.pageId === pageId)
        if(pageIndex < 0) {
            return {ok: false, err: "PAGE_NOT_FOUND"}
        }
        const page = bookmarkModel.pages[pageIndex]
        if(moveToBookmark !== bookmarkId) {
            const targetBookmarkModel = await t.getBookmark(moveToBookmark)
            if(targetBookmarkModel === undefined) {
                return {ok: false, err: "TARGET_BOOKMARK_NOT_FOUND"}
            }
            const originPages = [...bookmarkModel.pages.slice(0, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1)]
            const targetPages = moveToIndex === null || moveToIndex < 0 || moveToIndex >= targetBookmarkModel.pages.length ? [...targetBookmarkModel.pages, page] : [...targetBookmarkModel.pages.slice(0, moveToIndex), page, ...targetBookmarkModel.pages.slice(moveToIndex)]
            const newOriginBookmark = {...bookmarkModel, pages: originPages}
            const newTargetBookmark = {...targetBookmarkModel, pages: targetPages}
            await t.putBookmark(newOriginBookmark)
            await t.putBookmark(newTargetBookmark)
            t.putPageReference({pageId, bookmarkId: moveToBookmark, url: page.url})
            return {ok: true, value: {origin: newOriginBookmark, target: newTargetBookmark}}
        }else if(moveToIndex !== pageIndex) {
            const pages = moveToIndex === null || moveToIndex < 0 || moveToIndex >= bookmarkModel.pages.length - 1 ? [...bookmarkModel.pages.slice(0, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1), page]
                : moveToIndex > pageIndex ? [...bookmarkModel.pages.slice(0, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1, moveToIndex + 1), page, ...bookmarkModel.pages.slice(moveToIndex + 1)]
                : [...bookmarkModel.pages.slice(0, moveToIndex), page, ...bookmarkModel.pages.slice(moveToIndex, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1)]
            const newBookmark = {...bookmarkModel, pages}
            await t.putBookmark(newBookmark)
            return {ok: true, value: {origin: newBookmark, target: newBookmark}}
        }else{
            return {ok: true, value: {origin: bookmarkModel, target: bookmarkModel}}
        }
    },
    async deletePage(bookmarkId: number, pageId: number): Promise<Result<undefined, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        const pageIndex = bookmarkModel.pages.findIndex(p => p.pageId === pageId)
        if(pageIndex < 0) {
            return {ok: false, err: "PAGE_NOT_FOUND"}
        }
        const page = bookmarkModel.pages[pageIndex]
        
        const now = new Date()
        const pages = [...bookmarkModel.pages.slice(0, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1)]
        const lastCollectTime = page.lastCollectTime !== undefined ? pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre) : bookmarkModel.lastCollectTime
        await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: now})
        await t.deletePageReference(pageId)
        return {ok:true, value: undefined}
    },
    async getGroups(): Promise<GroupModel[]> {
        const t = await databases.transaction("group", "readonly")
        return await t.cursorGroup().toList()
    },
    async addGroup(form: GroupModel): Promise<Result<GroupModel, "ALREADY_EXISTS">> {
        const t = await databases.transaction("group", "readwrite")
        const model = await t.getGroup(form.groupKeyPath)
        if(model !== undefined) {
            return {ok: false, err: "ALREADY_EXISTS"}
        }
        const res = await t.putGroup(form)

        return {ok: true, value: res}
    },
    async updateGroup(form: GroupModel): Promise<Result<GroupModel, "NOT_FOUND" | "ITEM_OCCUPIED">> {
        const t = await databases.transaction(["group", "bookmark"], "readwrite")
        const model = await t.getGroup(form.groupKeyPath)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        const removedItems = model.items.filter(item => !form.items.some(newItem => newItem.itemKeyPath === item.itemKeyPath)).map(item => item.itemKeyPath)
        const occupiedCount = removedItems.length > 0 ? await t.cursorBookmark().filter(record => record.groups.some(([gn, gk]) => model.groupKeyPath === gn && removedItems.includes(gk)) || record.pages.some(p => p.groups?.some(([gn, gk]) => model.groupKeyPath === gn && removedItems.includes(gk)))).count() : 0
        if(occupiedCount > 0) {
            return {ok: false, err: "ITEM_OCCUPIED"}
        }

        const res = await t.putGroup(form)
        
        return {ok: true, value: res}
    },
    async deleteGroup(groupKeyPath: string): Promise<Result<undefined, "NOT_FOUND" | "GROUP_OCCUPIED">> {
        const t = await databases.transaction(["group", "bookmark"], "readwrite")
        const model = await t.getGroup(groupKeyPath)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        const occupiedCount = await t.cursorBookmark()
            .filter(record => record.groups.some(([gn, _]) => groupKeyPath === gn) || record.pages.some(p => p.groups?.some(([gn, _]) => groupKeyPath === gn)))
            .count()
        if(occupiedCount > 0) {
            return {ok: false, err: "GROUP_OCCUPIED"}
        }
        await t.deleteGroup(groupKeyPath)
        return {ok: true, value: undefined}
    }
}

function generateHost(url: string): string {
    try {
        const u = new URL(url)
        return u.host
    }catch(e) {
        return ""
    }
}

interface QueryBookmarkFilter {
    search?: string
    groups?: [string, string][]
    limit?: number
    offset?: number
    order?: "createTime" | "updateTime" | "lastCollectTime" | "score"
    orderDirection?: "asc" | "desc"
}

export interface BookmarkForm {
    name: string
    otherNames: string[]
    description: string
    keywords: string[]
    groups: [string, string][]
    score: number | undefined
}

export interface PageForm {
    url: string
    title: string
    description: string | undefined
    keywords: string[] | undefined
    groups: [string, string][] | undefined
    lastCollect: string | undefined
    lastCollectTime: Date | undefined
}
