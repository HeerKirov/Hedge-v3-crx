import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { server } from "@/functions/server"
import { bookmarks } from "@/services/bookmarks"

export function tabCreated(tab: chrome.tabs.Tab) {
    if(tab.id !== undefined && tab.id !== chrome.tabs.TAB_ID_NONE && tab.url !== undefined) setActiveTabIcon(tab.id, tab.url).finally()
}

export function tabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
    if(changeInfo.url !== undefined || (changeInfo.status !== undefined && tab.url !== undefined)) setActiveTabIcon(tabId, changeInfo.url ?? tab.url!).finally()
}

/**
 * 提供来源数据信息，为指定tab设置badge。
 */
export async function setActiveTabBadge(tabId: number, sourceDataPath: SourceDataPath) {
    const res = await server.sourceData.getCollectStatus([sourceDataPath])
    if(res.ok) {
        const [collectStatus] = res.data
        setActiveTabBadgeByStatus(tabId, collectStatus)
    }
}

/**
 * 直接提供CollectStatus结果，为指定tab设置badge。
 */
export function setActiveTabBadgeByStatus(tabId: number, collectStatus: SourceDataCollectStatus) {
    if(collectStatus.imageCount > 0 && collectStatus.collected) {
        //图像和来源数据都已收集
        chrome.action.setBadgeText({tabId, text: collectStatus.imageCount > 1 ? `C:${collectStatus.imageCount}` : "CLTD"}).finally()
        chrome.action.setBadgeBackgroundColor({tabId, color: "#1468cc"}).finally()
    }else if(collectStatus.collected) {
        //只收集了来源数据，没有图像
        chrome.action.setBadgeBackgroundColor({tabId, color: "#00DDDD"}).finally()
        chrome.action.setBadgeText({tabId, text: "SRC"}).finally()
    }else if(collectStatus.imageCount > 0) {
        //只收集了图像，没有来源数据
        chrome.action.setBadgeBackgroundColor({tabId, color: "#00DD00"}).finally()
        chrome.action.setBadgeText({tabId, text: "IMG"}).finally()
    }
}

/**
 * 提供URL，为指定tab设置icon。
 */
async function setActiveTabIcon(tabId: number, url: string) {
    if(url.startsWith("https://") || url.startsWith("http://")) {
        const res = await bookmarks.queryPageByURL(url)
        setActiveTabIconByBookmarked(tabId, res !== undefined)
    }
}

/**
 * 直接为当前tab设置icon。
 */
export function setActiveTabIconByBookmarked(tabId: number, bookmarked: boolean) {
    chrome.action.setIcon({tabId, path: bookmarked ? "/icon-bookmarked.png" : "/icon-not-bookmarked.png"}).finally()
}
