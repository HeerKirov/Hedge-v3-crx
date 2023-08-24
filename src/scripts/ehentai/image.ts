import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"

document.addEventListener("DOMContentLoaded", async () => {
    const setting = await settings.get()
    loadGalleryPageHash()
    loadActiveTabInfo(setting)
})

chrome.runtime.onMessage.addListener(receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA_PATH") {
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
 * 加载gallery page数据。将image hash信息保存到session。
 */
function loadGalleryPageHash() {
    const re = /\/s\/(?<PHASH>\S+)\/(?<GID>\d+)-(?<PAGE>\d+)/
    const res = re.exec(document.location.pathname)
    if(res && res.groups) {
        const imageHash = res.groups["PHASH"]
        const gid = res.groups["GID"]
        const page = res.groups["PAGE"]
        sessions.reflect.ehentaiGalleryImageHash.set({gid, page}, {imageHash})
    }
}

/**
 * 事件：获得当前页面的SourceDataPath。当前页面为image页，可以获得gid、page和imageHash。
 */
function reportSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["ehentai"]
    const sourceSite = overrideRule?.sourceSite ?? "ehentai"
    const { gid, page, imageHash } = getIdentityInfo()
    return {sourceSite, sourceId: gid, sourcePart: page, sourcePartName: imageHash}
}

/**
 * 获得GalleryId、Page和ImageHash。
 */
function getIdentityInfo(): {gid: number, page: number, imageHash: string} {
    const match = document.location.pathname.match(/\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)/)
    if(match && match.groups) {
        const gid = parseInt(match.groups["GID"])
        const page = parseInt(match.groups["PAGE"])
        const imageHash = match.groups["PHASH"]
        return {gid, page, imageHash}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}