import { databases, Transaction, BookmarkModel, GroupModel, Page, PageReferenceModel, StoredQueryModel } from "@/functions/database"
import { Result, numbers, objects } from "@/utils/primitives"

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
            .order(filter?.order === "createTime" ? undefined /* 由于项的ID顺序与createTime正相关，createTime被直接处理为无排序 */
                : filter?.order === "updateTime" ? ((a, b) => numbers.compareTo(a.updateTime.getTime(), b.updateTime.getTime()))
                : filter?.order === "lastCollectTime" ? ((a, b) => a.lastCollectTime !== undefined && b.lastCollectTime !== undefined ? numbers.compareTo(a.lastCollectTime.getTime(), b.lastCollectTime.getTime()) : a.lastCollectTime === undefined && b.lastCollectTime === undefined ? 0 : a.lastCollectTime === undefined ? -1 : 1)
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
    async getPageReferences(): Promise<PageReferenceModel[]> {
        const t = await databases.transaction("pageReference", "readonly")
        return await t.cursorPageReference().toList()
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
    async addPage(bookmarkId: number, insertPageIndex: number | null, form: PageForm): Promise<Result<{bookmark: BookmarkModel, page: Page}, "BOOKMARK_NOT_FOUND" | "URL_ALREADY_EXISTS">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        const normalizedURL = normalizeURL(form.url)
        if(normalizedURL.url.length > 0 && (await t.getPageReferenceByUrl(normalizedURL.url)) !== undefined) {
            return {ok: false, err: "URL_ALREADY_EXISTS"}
        }
        const now = new Date()
        const pageRefModel = await t.addPageReference({url: normalizedURL.url, bookmarkId: bookmarkModel.bookmarkId})
        const page: Page = {pageId: pageRefModel.pageId, ...form, ...normalizedURL, createTime: now, updateTime: now}
        const pages = insertPageIndex !== null ? [...bookmarkModel.pages.slice(0, insertPageIndex), page, ...bookmarkModel.pages.slice(insertPageIndex)] : [...bookmarkModel.pages, page]
        const lastCollectTime = pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre)
        const newBookmark = await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: now})
        return {ok: true, value: {bookmark: newBookmark, page}}
    },
    async updatePage(bookmarkId: number, pageId: number, form: PageForm): Promise<Result<{bookmark: BookmarkModel, page: Page}, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND" | "URL_ALREADY_EXISTS">> {
        const queryPageRes = await internalGetPage(bookmarkId, pageId)
        if(!queryPageRes.ok) {
            return queryPageRes
        }
        const { t, bookmarkModel, page, pageIndex } = queryPageRes.value
        const normalizedURL = normalizeURL(form.url)
        if(normalizedURL.url !== page.url && normalizedURL.url.length > 0 && (await t.getPageReferenceByUrl(normalizedURL.url)) !== undefined) {
            return {ok: false, err: "URL_ALREADY_EXISTS"}
        }
        const fieldChanged = form.title !== page.title || normalizedURL.url !== page.url || form.description !== page.description || !objects.deepEquals(form.keywords, page.keywords) || !objects.deepEquals(form.groups, page.groups)
        const now = new Date()
        const newPage = {...page, ...form, ...normalizedURL, updateTime: fieldChanged ? now : page.updateTime}
        const pages = [...bookmarkModel.pages.slice(0, pageIndex), newPage, ...bookmarkModel.pages.slice(pageIndex + 1)]
        const lastCollectTime = form.lastCollectTime?.getTime() !== page.lastCollectTime?.getTime() ? pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre) : bookmarkModel.lastCollectTime
        const newBookmark = await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: fieldChanged ? now : bookmarkModel.updateTime})
        if(newPage.url !== page.url) {
            await t.putPageReference({pageId, bookmarkId, url: newPage.url})
        }
        return {ok: true, value: {bookmark: newBookmark, page: newPage}}
    },
    async movePage(bookmarkId: number, pageId: number, moveToBookmark: number, moveToIndex: number | null): Promise<Result<{origin: BookmarkModel, target: BookmarkModel}, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND" | "TARGET_BOOKMARK_NOT_FOUND">> {
        const queryPageRes = await internalGetPage(bookmarkId, pageId)
        if(!queryPageRes.ok) {
            return queryPageRes
        }
        const { t, bookmarkModel, page, pageIndex } = queryPageRes.value
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
            await t.putPageReference({pageId, bookmarkId: moveToBookmark, url: page.url})
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
        const queryPageRes = await internalGetPage(bookmarkId, pageId)
        if(!queryPageRes.ok) {
            return queryPageRes
        }
        const { t, bookmarkModel, page, pageIndex } = queryPageRes.value
        const now = new Date()
        const pages = [...bookmarkModel.pages.slice(0, pageIndex), ...bookmarkModel.pages.slice(pageIndex + 1)]
        const lastCollectTime = page.lastCollectTime === undefined ? bookmarkModel.lastCollectTime
            : pages.length <= 0 ? undefined
            : pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre)
        await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: now})
        await t.deletePageReference(pageId)
        return {ok:true, value: undefined}
    },
}

export const groups = {
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
        const occupiedCount = removedItems.length <= 0 ? 0 : await t.cursorBookmark()
            .filter(record => record.groups.some(([gn, gk]) => model.groupKeyPath === gn && removedItems.includes(gk)) || record.pages.some(p => p.groups?.some(([gn, gk]) => model.groupKeyPath === gn && removedItems.includes(gk))))
            .count()
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
            .filter(record => record.groups.some(([gn]) => groupKeyPath === gn) || record.pages.some(p => p.groups?.some(([gn]) => groupKeyPath === gn)))
            .count()
        if(occupiedCount > 0) {
            return {ok: false, err: "GROUP_OCCUPIED"}
        }
        await t.deleteGroup(groupKeyPath)
        return {ok: true, value: undefined}
    },
}

export const storedQueries = {
    async getStoredQueries(): Promise<StoredQueryModel[]> {
        const t = await databases.transaction("query", "readonly")
        return await t.cursorStoredQuery().order((a, b) => numbers.compareTo(a.ordinal, b.ordinal)).toList()
    },
    async addStoredQuery(form: StoredQueryForm): Promise<StoredQueryModel> {
        const t = await databases.transaction("query", "readwrite")
        const count = await t.cursorStoredQuery().count()
        return await t.addStoredQuery({...form, ordinal: count})
    },
    async updateStoredQuery(queryId: number, form: StoredQueryForm): Promise<Result<StoredQueryModel, "NOT_FOUND">> {
        const t = await databases.transaction("query", "readwrite")
        const model = await t.getStoredQuery(queryId)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        const res = await t.putStoredQuery({...model, ...form})
        return {ok: true, value: res}
    },
    async moveStoredQuery(queryId: number, moveToOrdinal: number): Promise<Result<undefined, "NOT_FOUND">> {
        const t = await databases.transaction("query", "readwrite")
        const model = await t.getStoredQuery(queryId)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        const count = await t.cursorStoredQuery().count()
        const finalOrdinal = moveToOrdinal < 0 ? 0 : moveToOrdinal > count - 1 ? count - 1 : moveToOrdinal
        if(finalOrdinal !== model.ordinal) {
            await t.putStoredQuery({...model, ordinal: finalOrdinal})
        }
        if(finalOrdinal > model.ordinal) {
            const effectedSq = await t.cursorStoredQuery().filter(r => r.queryId !== model.queryId && model.ordinal < r.ordinal && r.ordinal <= finalOrdinal).toList()
            for(const sq of effectedSq) {
                await t.putStoredQuery({...sq, ordinal: sq.ordinal - 1})
            }
        }else if(finalOrdinal < model.ordinal) {
            const effectedSq = await t.cursorStoredQuery().filter(r => r.queryId !== model.queryId && finalOrdinal <= r.ordinal && r.ordinal < model.ordinal).toList()
            for(const sq of effectedSq) {
                await t.putStoredQuery({...sq, ordinal: sq.ordinal + 1})
            }
        }
        return {ok: true, value: undefined}
    },
    async deleteStoredQuery(queryId: number): Promise<Result<undefined, "NOT_FOUND">> {
        const t = await databases.transaction("query", "readwrite")
        const model = await t.getStoredQuery(queryId)
        if(model === undefined) {
            return {ok: false, err: "NOT_FOUND"}
        }
        await t.deleteStoredQuery(queryId)
        const effectedSq = await t.cursorStoredQuery().filter(r => r.ordinal > model.ordinal).toList()
        for(const sq of effectedSq) {
            await t.putStoredQuery({...sq, ordinal: sq.ordinal - 1})
        }
        return {ok: true, value: undefined}
    }
}

async function internalGetPage(bookmarkId: number, pageId: number): Promise<Result<{t: Transaction, bookmarkModel: BookmarkModel, page: Page, pageIndex: number}, "BOOKMARK_NOT_FOUND" | "PAGE_NOT_FOUND">> {
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
    return {ok: true, value: {t, bookmarkModel, page, pageIndex}}
}

/**
 * 直接被用户输入的URL可能不太标准，例如没有Protocol，或者单独的hostname后面没加斜线(这可能导致页面URL与写入值匹配不上)。
 * 因此使用此函数将URL标准化处理。对于空串，直接返回空；对于无法解析的URL，添加http://前缀再解析。
 */
function normalizeURL(url: string): {url: string, host: string} {
    if(url.trim()) {
        try {
            const u = new URL(url.trim())
            return {url: u.href, host: u.host}
        }catch(e) {
            const u = new URL(`http://${url.trim()}`)
            return {url: u.href, host: u.host}
        }
    }else{
        return {url: "", host: ""}
    }
}

export interface QueryBookmarkFilter {
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

export interface StoredQueryForm {
    name: string
    search: string | undefined
    groups: [string, string][] | undefined
    order: "createTime" | "updateTime" | "lastCollectTime" | "score" | undefined
    orderDirection: "asc" | "desc" | undefined
}
