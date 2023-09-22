import { SourceDataPath } from "@/functions/server/api-all"
import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { Result } from "@/utils/primitives"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/gallery script loaded.")
    const setting = await settings.get()
    loadActiveTabInfo(setting)
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
 * 在开启forbidden时，将开展更多屏蔽规则，包括：
 * - 屏蔽Vote过低的评论；
 * - 存在Vote过低的评论/至少2条banList中的评论，且同时存在至少2条Vote较高的评论，且这些评论都包含中文时，屏蔽评论区的所有中文评论
 */
function enableCommentFilter(forbidden: boolean, banList: string[]) {
    const divs = document.querySelectorAll<HTMLDivElement>("div#cdiv > div.c1")

    const chinese: boolean[] = []
    const lowVote: boolean[] = []
    const highVote: boolean[] = []
    const banned: boolean[] = []

    for(let i = 0; i < divs.length; ++i) {
        const div = divs[i]
        if(div.querySelector("a[name=ulcomment]")) continue

        const c5 = div.querySelector<HTMLSpanElement>("div.c5 > span")
        if(c5?.textContent) {
            const vote = parseInt(c5.textContent)
            //低Vote评论
            if(vote <= -20) lowVote[i] = true
            //高Vote评论
            if(vote >= 20) highVote[i] = true
        }
        const c6 = div.querySelector<HTMLDivElement>("div.c6")
        if(c6?.textContent) {
            //中文评论
            if(/.*[\u4e00-\u9fa5]+.*$/.test(c6.textContent)) chinese[i] = true
            //包含被ban的关键词
            if(banList.some(b => c6.textContent!.includes(b))) banned[i] = true
        }
    }

    const forbiddenAnyChinese = (lowVote.some((_, i) => chinese[i]) || banned.filter((_, i) => chinese[i]).length >= 2) && (highVote.filter((_, i) => chinese[i]).length >= 2)

    for(let i = 0; i < divs.length; ++i) {
        const div = divs[i]
        if(banned[i] || lowVote[i]) {
            const c6 = div.querySelector<HTMLDivElement>("div.c6")
            if(c6) {
                c6.style.color = "black"
                c6.style.backgroundColor = "black"
            }
        }else if(forbiddenAnyChinese && chinese[i]) {
            const c6 = div.querySelector<HTMLDivElement>("div.c6")
            if(c6) {
                c6.style.color = "grey"
                c6.style.backgroundColor = "grey"
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
