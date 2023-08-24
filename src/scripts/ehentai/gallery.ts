import { SourceDataPath } from "@/functions/server/api-all"
import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { Result } from "@/utils/primitives"

settings.get().then(setting => {
    loadActiveTabInfo(setting)
})

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[Hedge v3 Helper] ehentai/gallery script loaded.")
    const setting = await settings.get()
    if(setting.tool.ehentai.enableCommentForbidden || setting.tool.ehentai.enableCommentBanned) enableCommentFilter(setting.tool.ehentai.enableCommentForbidden, setting.tool.ehentai.enableCommentBanned ? setting.tool.ehentai.commentBannedList : []) 
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
function reportSourceData(setting: Setting): Result<SourceDataUpdateForm, string> {
    const rule = setting.sourceData.overrideRules["ehentai"] ?? SOURCE_DATA_COLLECT_SITES["ehentai"]

    const tags: SourceTagForm[] = []
    const tagListDiv = document.querySelector<HTMLDivElement>("#taglist")
    if(tagListDiv) {
        const trList = tagListDiv.querySelectorAll<HTMLTableRowElement>("tr")
        for(const tr of trList) {
            let type: string
            const typeTd = tr.querySelector("td.tc")
            if(typeTd && typeTd.textContent) {
                type = typeTd.textContent.substring(0, typeTd.textContent.length - 1)
            }else{
                return {ok: false, err: `Tag: Cannot analyse tag type from 'td.tc'.`}
            }
            const tagAnchorList = tr.querySelectorAll<HTMLAnchorElement>("td.tc + td > div > a")
            if(tagAnchorList.length <= 0) {
                return {ok: false, err: `Tag: Cannot find any tag of type '${type}'.`}
            }
            for(const tagAnchor of tagAnchorList) {
                const [name, otherName] = tagAnchor.textContent!.split("|").map(i => i.trim())
                tags.push({code: name, name, otherName, type})
            }
        }
    }else{
        return {ok: false, err: `Tag: cannot find '#taglist'.`}
    }

    //画廊的类型(doujinshi, image set)也会被作为tag写入，类型固定为"category"，code为"category/{category-}"
    const categoryDiv = document.querySelector<HTMLDivElement>(".gm .cs")
    if(categoryDiv) {
        const category = categoryDiv.textContent!
        tags.push({code: `category/${category.toLowerCase().replace(" ", "-")}`, name: category, type: "category"})
    }else{
        return {ok: false, err: `Category: cannot find '.cs'.`}
    }

    const additionalInfo: SourceAdditionalInfoForm[] = []
    const pathnameMatch = document.location.pathname.match(/\/g\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)/)
    if(pathnameMatch && pathnameMatch.groups) {
        const value = pathnameMatch.groups["TOKEN"]
        const field = rule.additionalInfo["token"]
        additionalInfo.push({field, value})
    }
    
    let title: string | undefined
    let description: string | undefined
    
    const primaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gn")
    const secondaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gj")
    const uploaderCommentDiv = document.querySelector<HTMLDivElement>("#cdiv > .c1")
    const primaryTitle = primaryTitleHeading !== null ? primaryTitleHeading.textContent || undefined : undefined
    const secondaryTitle = secondaryTitleHeading !== null ? secondaryTitleHeading.textContent || undefined : undefined
    const uploaderComment = uploaderCommentDiv && uploaderCommentDiv.querySelector("a[name=ulcomment]") ? uploaderCommentDiv.querySelector<HTMLDivElement>("#comment_0")!.innerText || undefined : undefined
    //secondary title通常是日文标题，因此一般优先选用它
    if(secondaryTitle !== undefined) {
        title = secondaryTitle
        //如果同时存在primary title和uploader comment，则将它们组合成为description
        if(primaryTitle !== undefined && uploaderComment !== undefined) description = `${primaryTitle}\n\n${uploaderComment}`
        else if(primaryTitle !== undefined) description = primaryTitle
        else if(uploaderComment !== undefined) description = uploaderComment
    }else if(primaryTitle !== undefined) {
        title = primaryTitle
        if(uploaderComment !== undefined) description = uploaderComment
    }else{
        return {ok: false, err: `Title: jp & en title both not found.`}
    }

    return {
        ok: true,
        value: {tags, title, description, additionalInfo}
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