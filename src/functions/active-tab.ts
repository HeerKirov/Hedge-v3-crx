import { SourceDataPath } from "@/functions/server/api-all"
import { sendMessageToTab } from "@/functions/messages"
import { useAsyncLoading } from "@/utils/reactivity"
import { SOURCE_DATA_COLLECT_SITES } from "./sites"
import { Setting, settings } from "./setting"

export interface SourceInfo {
    host: string
    sourceDataPath: SourceDataPath | null
}

/**
 * 解析当前页面是否属于受支持的网站，提供网站host，以及解析来源数据ID。
 */
export function useTabInfo() {
    const [sourceInfo] = useAsyncLoading<SourceInfo | null>(async () => {
        const setting = await settings.get()
        const tabs = await chrome.tabs.query({currentWindow: true, active: true})
        if(tabs.length > 0 && tabs[0].url && tabs[0].id && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
            const tabId = tabs[0].id
            const strURL = tabs[0].url
            const url = new URL(strURL)
            const sourceData = await matchTabSourceData(tabId, url, setting)
            if(sourceData !== null) {
                return sourceData
            }
        }
        return null
    })

    const collectSourceData = () => {
        //TODO 收集此active tab的来源数据
    }

    return {sourceInfo, collectSourceData}
}

/**
 * 提供来源数据信息，要求为当前tab设置badge。
 */
export function setActiveTabBadge(tabId: number, sourceDataPath: SourceDataPath) {
    //TODO 查询sourceData收集情况，然后设置badge
    chrome.action.setBadgeText({tabId, text: sourceDataPath.sourceId.toString()})
}

/**
 * 要求为当前tab设置icon。
 */
export function setActiveTabIcon(tabId: number) {
    //TODO 查询收藏夹情况，然后设置icon
}

/**
 * 解析URL，分析它属于哪个来源网站，并获取其来源数据信息。
 */
async function matchTabSourceData(tabId: number, url: URL, setting: Setting): Promise<{host: string, sourceDataPath: SourceDataPath | null} | null> {
    for(const siteName in SOURCE_DATA_COLLECT_SITES) {
        const site = SOURCE_DATA_COLLECT_SITES[siteName]
        const overrideRule = setting.sourceData.overrideRules[siteName]
        if(overrideRule && !overrideRule.enable) {
            continue
        }
        if(typeof site.host === "string" ? site.host === url.host : site.host.includes(url.host)) {
            if(site.sourcePages && site.sourcePages.some(i => typeof i === "string" ? i === url.pathname : i.test(url.pathname))) {
                const sourceDataPath = await sendMessageToTab(tabId, "REPORT_SOURCE_DATA_PATH", undefined)
                return {host: url.host, sourceDataPath}
            }else{
                return {host: url.host, sourceDataPath: null}
            }
        }
    }
    return null
}
