import { SourceDataPath } from "@/functions/server/api-all"
import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { Result } from "@/utils/primitives"

document.addEventListener("DOMContentLoaded", async () => {
    const setting = await settings.get()
    loadActiveTabInfo(setting)
    if(setting.tool.ehentai.enableCommentForbidden || setting.tool.ehentai.enableCommentBanned) enableCommentFilter(setting.tool.ehentai.enableCommentForbidden, setting.tool.ehentai.enableCommentBanned ? setting.tool.ehentai.commentBannedList : []) 
})

receiveMessageForTab(({ type, msg: _, callback }) => {
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
})

/**
 * 加载active tab在action badge上的标示信息。
 */
function loadActiveTabInfo(setting: Setting) {
    const sourceDataPath = reportSourceDataPath(setting)
    sendMessage("SET_ACTIVE_TAB_BADGE", {path: sourceDataPath})
}

/**
 * 功能：评论区屏蔽机制。
 * 在给出banList时，将对评论区包含这些屏蔽字的评论进行屏蔽。
 * 在开启forbidden时，将按照一定的规则展开整体屏蔽。主要是用来针对CN用户的。
 */
function enableCommentFilter(forbidden: boolean, banList: string[]) {
    const chineseRegex = /.*[\u4e00-\u9fa5]+.*$/

    function anyBanned(text: string): boolean {
        return banList.some(b => text.includes(b))
    }
    
    const divs = document.querySelectorAll("div#cdiv > div.c1")
    if(forbidden) {
        const chineseUser = []
        const lowScore = []
        const banned = []
    
        for(let i = 0; i < divs.length; ++i) {
            const div = divs[i]
            if(div.querySelector("a[name=ulcomment]")) continue

            const c5 = div.querySelector("div.c5 > span")
            if(c5?.textContent && parseInt(c5.textContent) < -10) {
                lowScore.push(i)
            }
            const c6 = div.querySelector("div.c6")
            if(c6?.textContent) {
                if(chineseRegex.test(c6.textContent)) {
                    chineseUser.push(i)
                }
                if(anyBanned(c6.textContent)) {
                    banned.push(i)
                }
            }
        }
        //当: 评论区出现任意一条屏蔽词时；
        //  或评论区出现至少一条低分评论，且CN评论多于2时,
        //  都会对所有的评论展开屏蔽。
        if((chineseUser.length >= 2 && lowScore.length >= 1) || banned.length >= 1) {
            const list = [...new Set([...chineseUser, ...lowScore, ...banned]).values()]
            for(const idx of list) {
                const div = divs[idx]
                const c6 = div.querySelector("div.c6")!
                c6.textContent = "<FORBIDDEN>"
            }
        }
    }else{
        for(const div of divs) {
            if(div.querySelector("a[name=ulcomment]")) continue
            const c6 = div.querySelector("div.c6")
            if(c6?.textContent && anyBanned(c6.textContent)) {
                c6.textContent = "<BANNED>"
            }
        }
    }
}

/**
 * 事件：收集来源数据。
 */
function reportSourceData(setting: Setting): Result<SourceDataUpdateForm, Error> {
    const rule = setting.sourceData.overrideRules["ehentai"] ?? SOURCE_DATA_COLLECT_SITES["ehentai"]

    const tags: SourceTagForm[] = []

    const additionalInfo: SourceAdditionalInfoForm[] = []
    
    //TODO 收集ehentai来源数据

    return {
        ok: true,
        value: {tags, additionalInfo}
    }
}

/**
 * 事件：获得当前页面的SourceDataPath。需要注意的是，当前页面为gallery页，没有page参数。
 */
function reportSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["ehentai"]
    const sourceSite = overrideRule?.sourceSite ?? "ehentai"
    const gid = getGalleryId()
    return {sourceSite, sourceId: gid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得GalleryId。
 */
function getGalleryId(): number {
    const match = document.location.pathname.match(/\/g\/(?<GID>\d+)\/[a-zA-Z0-9]+/)
    if(match && match.groups) {
        return parseInt(match.groups["GID"])
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}