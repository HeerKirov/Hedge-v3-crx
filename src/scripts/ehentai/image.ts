import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { onDOMContentLoaded } from "@/utils/document"
import { EHENTAI_CONSTANTS } from "@/functions/sites.ts"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/image script loaded.")
    const setting = await settings.get()
    loadActiveTabInfo(setting)
    loadGalleryPageHash()
    if(setting.tool.ehentai.enableImageDownloadAnchor) enableImageDownloadAnchor()
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
    const { gid, page, imageHash } = getIdentityInfo()
    sessions.reflect.ehentaiGalleryImageHash.set({gid: gid.toString(), page: page.toString()}, {imageHash})
}

/**
 * 功能：添加图片下载链接。
 * 有些图像没有最下方的图像下载链接，因为加载的图像就是它们的原图像。为保持操作统一，添加了一个下载链接，用扩展API实现其下载操作。
 */
function enableImageDownloadAnchor() {
    const i7 = document.querySelector("#i7")
    if(!i7) {
        console.warn("[enableImageDownloadAnchor] Cannot find div#i7.")
        return
    }

    if(!i7.querySelector("a")) {
        const img = document.querySelector<HTMLImageElement>("#img")
        if(!img) {
            console.warn("[enableImageDownloadAnchor] Cannot find #img.")
            return
        }

        const i = document.createElement("img")
        i.src = "https://ehgt.org/g/mr.gif"
        i.className = "mr"

        const anchor = document.createElement("a")
        anchor.textContent = "(Download original from img link)"
        anchor.style.cursor = "pointer"
        anchor.onclick = () => sendMessage("DOWNLOAD_URL", {url: img.src, referrer: document.URL})

        i7.appendChild(i)
        i7.appendChild(document.createTextNode(" "))
        i7.appendChild(anchor)
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
    const re = EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME
    const match = document.location.pathname.match(re)
    if(match && match.groups) {
        const gid = parseInt(match.groups["GID"])
        const page = parseInt(match.groups["PAGE"])
        const imageHash = match.groups["PHASH"]
        return {gid, page, imageHash}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
