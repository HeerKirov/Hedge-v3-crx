import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { server } from "@/functions/server"

export interface SourceInfo {
    tabId: number
    siteName: string
    host: string
    sourceDataPath: SourceDataPath | null
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
        chrome.action.setBadgeText({tabId, text: collectStatus.imageCount > 1 ? `C:${collectStatus.imageCount}` : "CLTD"})
        chrome.action.setBadgeBackgroundColor({tabId, color: "#1468cc"})
    }else if(collectStatus.collected) {
        //只收集了来源数据，没有图像
        chrome.action.setBadgeBackgroundColor({tabId, color: "#00DDDD"})
        chrome.action.setBadgeText({tabId, text: "SRC"})
    }else if(collectStatus.imageCount > 0) {
        //只收集了图像，没有来源数据
        chrome.action.setBadgeBackgroundColor({tabId, color: "#00DD00"})
        chrome.action.setBadgeText({tabId, text: "IMG"})
    }
}

/**
 * 要求为当前tab设置icon。
 */
export async function setActiveTabIcon(tabId: number) {
    //TODO 查询收藏夹情况，然后设置icon
}
