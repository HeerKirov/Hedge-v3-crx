import { useEffect, useState } from "react"
import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { SourceDataCollectStatus } from "@/functions/server/api-source-data"
import { server } from "@/functions/server"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { collectSourceData } from "@/services/source-data"
import { sendMessageToTab } from "@/services/messages"
import { useAsyncLoading } from "@/utils/reactivity"

export interface SourceInfo {
    tabId: number
    siteName: string
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
            return await matchTabSourceData(tabId, url, setting)
        }
        return null
    })

    const [collectStatus, setCollectStatus] = useState<SourceDataCollectStatus | null>(null)

    const refreshCollectStatus = async () => {
        if(sourceInfo && sourceInfo.sourceDataPath) {
            const res = await server.sourceData.getCollectStatus([sourceInfo.sourceDataPath])
            if(res.ok) {
                const [collectStatus] = res.data
                setCollectStatus(collectStatus)
                setActiveTabBadgeByData(sourceInfo.tabId, collectStatus)
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
            if(ok) {
                refreshCollectStatus()
            }
        }
    }

    useEffect(() => { refreshCollectStatus().finally() }, [sourceInfo])

    return {sourceInfo, collectStatus, manualCollectSourceData}
}

/**
 * 提供来源数据信息，为指定tab设置badge。
 */
export async function setActiveTabBadge(tabId: number, sourceDataPath: SourceDataPath) {
    const res = await server.sourceData.getCollectStatus([sourceDataPath])
    if(res.ok) {
        const [collectStatus] = res.data
        setActiveTabBadgeByData(tabId, collectStatus)
    }
}

/**
 * 直接提供CollectStatus结果，为指定tab设置badge。
 */
function setActiveTabBadgeByData(tabId: number, collectStatus: SourceDataCollectStatus) {
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
            if(site.sourcePages && site.sourcePages.some(i => typeof i === "string" ? i === url.pathname : i.test(url.pathname))) {
                const sourceDataPath = await sendMessageToTab(tabId, "REPORT_SOURCE_DATA_PATH", undefined)
                return {tabId, siteName, host: url.host, sourceDataPath}
            }else{
                return {tabId, siteName, host: url.host, sourceDataPath: null}
            }
        }
    }
    return null
}
