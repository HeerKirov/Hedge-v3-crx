import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { Result } from "@/utils/primitives"

document.addEventListener("DOMContentLoaded", async () => {
    const setting = await settings.get()
    loadActiveTabInfo(setting)
})

chrome.runtime.onMessage.addListener(receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        settings.get().then(setting => {
            callback(reportSourceData(setting))
        })
        return true
    }else if(type === "REPORT_SOURCE_DATA_PATH") {
        settings.get().then(setting => {
            callback(reportSourceDataPath(setting))
        })
        return true
    }else{
        return false
    }
}))

/**
 * 加载active tab在action badge上的标示信息。
 */
function loadActiveTabInfo(setting: Setting) {
    const sourceDataPath = reportSourceDataPath(setting)
    sendMessage("SET_ACTIVE_TAB_BADGE", {path: sourceDataPath})
}

/**
 * 事件：收集来源数据。
 */
function reportSourceData(setting: Setting): Result<SourceDataUpdateForm, Error> {
    const overrideRule = setting.sourceData.overrideRules["pixiv"]

    const tags: SourceTagForm[] = []
    
    //TODO 收集pixiv来源数据

    return {
        ok: true,
        value: {tags}
    }
}

/**
 * 事件：获得当前页面的SourceDataPath。需要注意的是，pixiv的页面构成只能解析到id，没有page参数。
 */
function reportSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["pixiv"]
    const sourceSite = overrideRule?.sourceSite ?? "pixiv"
    const pid = getPID()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getPID(): number {
    const match = document.location.pathname.match(/\/artworks\/(?<PID>\d+)/)
    if(match && match.groups) {
        return parseInt(match.groups["PID"])
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}