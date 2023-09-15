import { useState } from "react"
import { Setting, settings } from "@/functions/setting"
import { BookmarkModel, Page } from "@/functions/database"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { server } from "@/functions/server"
import { bookmarks } from "@/services/bookmarks"
import { setActiveTabBadgeByStatus, setActiveTabIconByBookmarked } from "@/services/active-tab"
import { collectSourceData } from "@/services/source-data"
import { sendMessageToTab } from "@/services/messages"
import { useAsyncLoading } from "@/utils/reactivity"

export interface SourceInfo {
    tabId: number
    siteName: string
    host: string
    sourceDataPath: SourceDataPath | null
}

export interface BookmarkState {
    tabId: number
    bookmark: BookmarkModel
    page: Page
}

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
            const ok = await collectSourceData({siteName, sourceId, setting, skipCheckingCache: true})
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
    const [bookmarkState] = useAsyncLoading<BookmarkState | null>(async () => {
        const tabs = await chrome.tabs.query({currentWindow: true, active: true})
        if(tabs.length > 0 && tabs[0].url && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
            const tabId = tabs[0].id
            const strURL = tabs[0].url
            if(strURL && (strURL.startsWith("https://") || strURL.startsWith("http://"))) {
                const res = await bookmarks.queryPageByURL(strURL)
                setActiveTabIconByBookmarked(tabId, res !== undefined)
                if(res !== undefined) {
                    return {...res, tabId}
                }
            }
        }
        return null
    })

    return {bookmarkState}
}
