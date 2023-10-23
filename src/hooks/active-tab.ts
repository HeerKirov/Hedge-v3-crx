import { useState, useCallback } from "react"
import { Setting, settings } from "@/functions/setting"
import { BookmarkModel, Page } from "@/functions/database"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import {
    BETA_SANKAKUCOMPLEX_CONSTANTS,
    EHENTAI_CONSTANTS,
    PIXIV_CONSTANTS,
    SANKAKUCOMPLEX_CONSTANTS,
    SOURCE_DATA_COLLECT_SITES
} from "@/functions/sites"
import { server } from "@/functions/server"
import { BookmarkForm, bookmarks, PageForm } from "@/services/bookmarks"
import { setActiveTabBadgeByStatus, setActiveTabIconByBookmarked } from "@/services/active-tab"
import { collectSourceData } from "@/services/source-data"
import { sendMessageToTab } from "@/services/messages"
import { useAsyncLoading } from "@/utils/reactivity"
import { strings } from "@/utils/primitives"

export interface SourceInfo {
    tabId: number
    siteName: string
    host: string
    sourceDataPath: SourceDataPath | null
}

export type BookmarkState
    = {tabId: number, state: "UNSUPPORTED"}
    | {tabId: number, state: "NOT_BOOKMARKED"}
    | {tabId: number, state: "BOOKMARKED", bookmark: BookmarkModel, page: Page, newAddedBookmark?: boolean, newAddedPage?: boolean}

/**
 * 解析当前页面是否属于受支持的网站，提供网站host，以及解析来源数据ID。
 */
export function useTabSourceInfo() {
    const [sourceInfo] = useAsyncLoading<SourceInfo | null>(async () => {
        const setting = await settings.get()
        const tabs = await chrome.tabs.query({currentWindow: true, active: true})
        if(tabs.length > 0 && tabs[0].url && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
            const tabId = tabs[0].id
            const strURL = tabs[0].url
            const url = new URL(strURL)
            const sourceInfo = await matchTabSourceData(tabId, url, setting)
            refreshCollectStatus(sourceInfo).finally()
            return sourceInfo
        }
        return null
    })

    const [collectStatus, setCollectStatus] = useState<SourceDataCollectStatus | null>(null)

    const refreshCollectStatus = async (sourceInfo: SourceInfo | null) => {
        if(sourceInfo && sourceInfo.sourceDataPath) {
            const res = await server.sourceData.getCollectStatus([sourceInfo.sourceDataPath])
            if(res.ok) {
                const [collectStatus] = res.data
                setCollectStatus(collectStatus)
                setActiveTabBadgeByStatus(sourceInfo.tabId, collectStatus)
            }else{
                setCollectStatus(null)
            }
        }else{
            setCollectStatus(null)
        }
    }

    const manualCollectSourceData = async () => {
        if(sourceInfo !== null && sourceInfo.sourceDataPath !== null) {
            const setting = await settings.get()
            const { siteName, sourceDataPath: { sourceId } } = sourceInfo
            const ok = await collectSourceData({siteName, sourceId, setting})
            if(ok) refreshCollectStatus(sourceInfo).finally()
        }
    }

    return {sourceInfo, collectStatus, manualCollectSourceData}
}

/**
 * 解析URL，分析它属于哪个来源网站，并获取其来源数据信息。
 */
async function matchTabSourceData(tabId: number, url: URL, setting: Setting): Promise<{tabId: number, siteName: string, host: string, sourceDataPath: SourceDataPath | null} | null> {
    for(const siteName in SOURCE_DATA_COLLECT_SITES) {
        const site = SOURCE_DATA_COLLECT_SITES[siteName]
        const overrideRule = setting.sourceData.overrideRules[siteName]
        if(overrideRule && !overrideRule.enable) {
            continue
        }
        if(typeof site.host === "string" ? site.host === url.host : site.host.includes(url.host)) {
            if(site.sourcePages && site.sourcePages.some(i => i.test(url.pathname))) {
                const sourceDataPath = await sendMessageToTab(tabId, "REPORT_SOURCE_DATA_PATH", undefined)
                return {tabId, siteName, host: url.host, sourceDataPath}
            }else{
                return {tabId, siteName, host: url.host, sourceDataPath: null}
            }
        }
    }
    return null
}

/**
 * 解析当前页面是否属于已保存的书签。
 */
export function useTabBookmarkState() {
    const [bookmarkState, setBookmarkState] = useAsyncLoading(async (): Promise<BookmarkState> => {
        const tabs = await chrome.tabs.query({currentWindow: true, active: true})
        if(tabs.length > 0 && tabs[0].url && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
            const tabId = tabs[0].id
            const strURL = tabs[0].url
            if(strURL && (strURL.startsWith("https://") || strURL.startsWith("http://"))) {
                const res = await bookmarks.queryPageByURL(strURL)
                setActiveTabIconByBookmarked(tabId, res !== undefined)
                if(res !== undefined) {
                    return {tabId, state: "BOOKMARKED", ...res}
                }else{
                    return {tabId, state: "NOT_BOOKMARKED"}
                }
            }
        }
        return {tabId: chrome.tabs.TAB_ID_NONE, state: "UNSUPPORTED"}
    })

    const updateBookmark = useCallback(async (bookmark: BookmarkForm) => {
        if(bookmarkState?.state === "BOOKMARKED") {
            const res = await bookmarks.updateBookmark(bookmarkState.bookmark.bookmarkId, bookmark)
            if(res.ok) {
                setBookmarkState({tabId: bookmarkState.tabId, state: "BOOKMARKED", bookmark: res.value, page: bookmarkState.page})
            }else{
                console.error(`[BookmarkState/updateBookmark] (bookmarkId=${bookmarkState.bookmark.bookmarkId}): ${res.err}`)
            }
        }
    }, [bookmarkState, setBookmarkState])

    const updatePage = useCallback(async (page: PageForm) => {
        if(bookmarkState?.state === "BOOKMARKED") {
            const res = await bookmarks.updatePage(bookmarkState.bookmark.bookmarkId, bookmarkState.page.pageId, page)
            if(res.ok) {
                setBookmarkState({tabId: bookmarkState.tabId, state: "BOOKMARKED", bookmark: res.value.bookmark, page: res.value.page})
            }else{
                console.error(`[BookmarkState/updatePage] (bookmarkId=${bookmarkState.bookmark.bookmarkId}, pageId=${bookmarkState.page.pageId}): ${res.err}`)
            }
        }
    }, [bookmarkState, setBookmarkState])

    const addPage = useCallback(async (targetBookmark: number | string) => {
        if(bookmarkState?.state === "NOT_BOOKMARKED") {
            let bookmarkId: number
            if(typeof targetBookmark === "string") {
                const b = await bookmarks.addBookmark({name: targetBookmark, otherNames: [], keywords: [], groups: [], description: "", score: undefined})
                bookmarkId = b.bookmarkId
            }else{
                bookmarkId = targetBookmark
            }
            const tab = await chrome.tabs.get(bookmarkState.tabId)
            if(!tab.url || tab.title === undefined) {
                console.error(`[BookmarkState/addPage]: url or title is empty. (url=[${tab.url}], title=[${tab.title}])`)
                return
            }
            const form: PageForm = {
                url: tab.url, title: tab.title,
                description: undefined, keywords: undefined, groups: undefined, lastCollect: undefined, lastCollectTime: undefined
            }
            const res = await bookmarks.addPage(bookmarkId, null, form)
            if(res.ok) {
                setBookmarkState({tabId: bookmarkState.tabId, state: "BOOKMARKED", bookmark: res.value.bookmark, page: res.value.page, newAddedBookmark: typeof targetBookmark === "string", newAddedPage: true})
                setActiveTabIconByBookmarked(bookmarkState.tabId, true)
            }else{
                if(typeof targetBookmark === "string") bookmarks.deleteBookmark(bookmarkId).finally()
                if(res.err === "URL_ALREADY_EXISTS") {
                    setBookmarkState()
                    console.warn(`[BookmarkState/addPage] (bookmarkId=${bookmarkId}): URL already exists.`)
                }else{
                    console.error(`[BookmarkState/addPage] (bookmarkId=${bookmarkId}): ${res.err}`)
                }
            }
        }
    }, [bookmarkState, setBookmarkState])

    const changeBookmarkOfPage = useCallback(async (newBookmark: number | string) => {
        if(bookmarkState?.state === "BOOKMARKED") {
            if(typeof newBookmark === "number") {
                const res = await bookmarks.movePage(bookmarkState.bookmark.bookmarkId, bookmarkState.page.pageId, newBookmark, null)
                if(res.ok) {
                    setBookmarkState({tabId: bookmarkState.tabId, state: "BOOKMARKED", bookmark: res.value.target, page: bookmarkState.page})
                }else{
                    console.error(`[BookmarkState/changeBookmarkOfPage] (bookmarkId=${bookmarkState.bookmark.bookmarkId}, pageId=${bookmarkState.page.pageId}, to=${newBookmark}): ${res.err}`)
                }
            }else{
                const b = await bookmarks.addBookmark({name: newBookmark, otherNames: [], keywords: [], groups: [], description: "", score: undefined})
                const res = await bookmarks.movePage(bookmarkState.bookmark.bookmarkId, bookmarkState.page.pageId, b.bookmarkId, null)
                if(res.ok) {
                    setBookmarkState({tabId: bookmarkState.tabId, state: "BOOKMARKED", bookmark: res.value.target, page: bookmarkState.page})
                }else{
                    console.error(`[BookmarkState/changeBookmarkOfPage] (bookmarkId=${bookmarkState.bookmark.bookmarkId}, pageId=${bookmarkState.page.pageId}, to=${b.bookmarkId}): ${res.err}`)
                }
            }
        }
    }, [bookmarkState, setBookmarkState])

    const deleteBookmark = useCallback(async () => {
        if(bookmarkState?.state === "BOOKMARKED") {
            const res = await bookmarks.deleteBookmark(bookmarkState.bookmark.bookmarkId)
            if(res.ok) {
                setBookmarkState({tabId: bookmarkState.tabId, state: "NOT_BOOKMARKED"})
                setActiveTabIconByBookmarked(bookmarkState.tabId, false)
            }else{
                console.error(`[BookmarkState/deleteBookmark] (bookmarkId=${bookmarkState.bookmark.bookmarkId}): ${res.err}`)
            }
        }
    }, [bookmarkState, setBookmarkState])

    const deletePage = useCallback(async () => {
        if(bookmarkState?.state === "BOOKMARKED") {
            const res = await bookmarks.deletePage(bookmarkState.bookmark.bookmarkId, bookmarkState.page.pageId)
            if(res.ok) {
                setBookmarkState({tabId: bookmarkState.tabId, state: "NOT_BOOKMARKED"})
                setActiveTabIconByBookmarked(bookmarkState.tabId, false)
            }else{
                console.error(`[BookmarkState/deletePage] (bookmarkId=${bookmarkState.bookmark.bookmarkId}): ${res.err}`)
            }
        }
    }, [bookmarkState, setBookmarkState])

    return {bookmarkState, updateBookmark, updatePage, addPage, changeBookmarkOfPage, deleteBookmark, deletePage}
}

/**
 * 根据页面标题，得出一个建议搜索或使用的书签名。
 */
export async function getSuggestedBookmarkNameByTab(tabId: number): Promise<string | null> {
    const tab = await chrome.tabs.get(tabId)
    if(tab.url !== undefined && tab.title !== undefined) {
        const url = new URL(tab.url)
        const site = SUGGESTED_SITES.find(site => site.hosts.includes(url.host))
        if(site !== undefined) {
            const suggestName = site.suggest(url, tab.title)
            if(suggestName !== undefined) {
                return suggestName
            }
        }
        return tab.title
    }
    return null
}

/**
 * active-tab功能中与Site相关的部分。在下列预定义的网站中，针对某些URL，支持分析其url/title并提取出bookmark中建议使用的名称。
 */
const SUGGESTED_SITES: SuggestedSite[] = [
    {
        hosts: SANKAKUCOMPLEX_CONSTANTS.HOSTS,
        suggest(url, title) {
            if(SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME.test(url.pathname)) {
                // 图像页，尝试提取artist name，且替换下划线
                const matched = title.match(/.* by (.+) | Sankaku Channel/)
                if(matched) {
                    return matched[1].replaceAll("_", " ")
                }
            }else if(SANKAKUCOMPLEX_CONSTANTS.REGEXES.SEARCH_PATHNAME.test(url.pathname) && url.searchParams.has("tags")) {
                // 一般搜索页，尝试从中提取artist name，且替换下划线
                const matched = title.match(/(.+) | Sankaku Channel/)
                if(matched) {
                    const artist = matched[1].split("+", 1)[0]
                    if(artist) {
                        return artist.replaceAll("_", " ")
                    }
                }
                const artist = url.searchParams.get("tags")!.split("+", 1)[0]
                if(artist) {
                    return artist.replaceAll("_", " ")
                }
            }
        }
    },
    {
        hosts: BETA_SANKAKUCOMPLEX_CONSTANTS.HOSTS,
        suggest(url, _) {
            if(BETA_SANKAKUCOMPLEX_CONSTANTS.REGEXES.SEARCH_PATHNAME.test(url.pathname) && url.searchParams.has("tags")) {
                const artist = url.searchParams.get("tags")!.split("+", 1)[0]
                if(artist) {
                    return artist.replaceAll("_", " ")
                }
            }
        }
    },
    {
        hosts: EHENTAI_CONSTANTS.HOSTS,
        suggest(url, title) {
            if(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME.test(url.pathname)) {
                // gallery画廊页面，取画廊标题
                const matched = title.match(/(.+) - E-Hentai Galleries/)
                if(matched) {
                    return matched[1]
                }
            }else if(EHENTAI_CONSTANTS.REGEXES.TAG_PATHNAME.test(url.pathname)) {
                //tag搜索页，按照正在搜索的tag，取tag name，且替换下划线
                const matched = title.match(/.*:(?<NAME>.+) - .*/)
                if(matched && matched.groups) {
                    return matched.groups["NAME"].replaceAll("_", " ")
                }
                const matched2 = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.TAG_PATHNAME)
                if(matched2 && matched2.groups) {
                    return matched2.groups["NAME"].replaceAll("_", " ")
                }
            }else if(url.pathname === "/" && url.searchParams.has("f_search")) {
                //一般搜索页，尝试找出正在搜索的tag，取tag name，且替换下划线
                const matched = url.searchParams.get("f_search")!.match(/([^:]+:)?(.+)\$?/)
                if(matched) {
                    return matched[2].replaceAll("_", " ")
                }
            }
        }
    },
    {
        hosts: PIXIV_CONSTANTS.HOSTS,
        suggest(url, title) {
            if(PIXIV_CONSTANTS.REGEXES.USER_ABOUT_PATHNAME.test(url.pathname)) {
                // users作者相关页面，取名为username
                const matched = title.match(/(.*) - pixiv$/)
                if(matched) {
                    const artist = matched[1]
                    return strings.removeSuffix(artist, ["的插图・漫画", "的插画", "的漫画"])
                }
            }else if(PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME.test(url.pathname)) {
                // artworks作品页面，取名为作者的username
                const matched = title.match(/(.*) - (.*) - pixiv$/)
                if(matched) {
                    const artist = matched[2]
                    return strings.removeSuffix(artist, ["的插图・漫画", "的插画", "的漫画"])
                }
            }
        }
    }
]
interface SuggestedSite {
    hosts: string[]
    suggest(url: URL, title: string): string | void
}
