import { databases } from "@/functions/database"
import { BookmarkModel, Page, PageReferenceModel } from "@/functions/database/model"
import { Result, numbers } from "@/utils/primitives"

export function tabCreated(tab: chrome.tabs.Tab) {
    
}

export function tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {

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
        return {
            ok: true, 
            value: await t.putBookmark({...model, ...form, updateTime: now})
        }
    },
    async deleteBookmark(bookmarkId: BookmarkModel["bookmarkId"]): Promise<Result<undefined, "NOT_FOUND">> {
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
    async addPage(bookmarkId: number, form: PageForm): Promise<Result<Page, "BOOKMARK_NOT_FOUND" | "URL_ALREADY_EXISTS">> {
        const t = await databases.transaction(["bookmark", "pageReference"], "readwrite")
        const bookmarkModel = await t.getBookmark(bookmarkId)
        if(bookmarkModel === undefined) {
            return {ok: false, err: "BOOKMARK_NOT_FOUND"}
        }
        if((await t.getPageReferenceByUrl(form.url)) !== undefined) {
            return {ok: false, err: "URL_ALREADY_EXISTS"}
        }
        const pageRefModel = await t.addPageReference({url: form.url, bookmarkId: bookmarkModel.bookmarkId})
        const now = new Date()
        const page: Page = {pageId: pageRefModel.pageId, ...form, createTime: now, updateTime: now}
        const pages = [...bookmarkModel.pages, page]
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
        const now = new Date()
        const newPage = {...page, ...form, updateTime: now}
        const pages = [...bookmarkModel.pages.slice(0, pageIndex), newPage, ...bookmarkModel.pages.slice(pageIndex + 1)]
        const lastCollectTime = form.lastCollectTime !== page.lastCollectTime ? pages.map(p => p.lastCollectTime).reduce((pre, cur) => pre === undefined || cur !== undefined && cur.getMilliseconds() > pre.getMilliseconds() ? cur : pre) : bookmarkModel.lastCollectTime
        await t.putBookmark({...bookmarkModel, pages, lastCollectTime, updateTime: now})
        return {ok: true, value: newPage}
    },
    async getGroups() {

    },
    async upsertGroup() {

    },
    async deleteGroup() {

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

interface BookmarkForm {
    name: string
    otherNames: string[]
    description: string
    keywords: string[]
    groups: [string, string][]
    score: number | undefined
}

interface PageForm {
    url: string
    host: string
    title: string
    description: string | undefined
    keywords: string[] | undefined
    groups: [string, string][] | undefined
    collectRange: { upToId: string, upToTime: Date } | undefined
    lastCollectTime: Date | undefined
}