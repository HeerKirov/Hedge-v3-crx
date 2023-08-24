import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { Result } from "@/utils/primitives"

//pixiv的页面结构现代而沉重，可能产生网络不好导致DOMContentLoaded事件无法或延迟触发的问题。
//而初始化内容里没有依赖DOM结构的功能，因此直接执行。
settings.get().then(setting => {
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
function reportSourceData(_: Setting): Result<SourceDataUpdateForm, Error> {
    const tags: SourceTagForm[] = []

    //查找作者，作为tag写入。作者的type固定为"artist"，code为"users/{UID}"
    const artistAnchor = document.querySelector("aside > section > h2 > div > div > a") as HTMLAnchorElement | null
    if(artistAnchor !== null) {
        const artistName = artistAnchor.querySelector("div")?.textContent
        if(!artistName) {
            return {ok: false, err: new Error(`Artist: artist name is empty.`) }
        }
        const match = artistAnchor.href.match(/\/users\/(?<UID>\d+)/)
        if(match?.groups) {
            const userId = match.groups["UID"]
            tags.push({code: `users/${userId}`, name: artistName, type: "artist"})
        }else{
            return {ok: false, err: new Error(`Artist: cannot analyse artist anchor href.`) }    
        }
    }else{
        return {ok: false, err: new Error(`Artist: cannot find artist section.`) }
    }

    //查找标签列表，作为tag写入。标签的type固定为"tag"，code为"{NAME}"
    const tagSpanList = document.querySelectorAll("figcaption footer ul > li > span")
    for(let i = 0; i < tagSpanList.length; ++i) {
        const tagSpan = tagSpanList[i]
        const subSpanList = tagSpan.getElementsByTagName("span")
        if(subSpanList.length >= 2) {
            const name = subSpanList[0].querySelector("a")?.textContent
            if(!name) {
                return {ok: false, err: new Error(`Tag[${i}]: tag name is empty.`) }
            }
            const otherName = subSpanList[1].querySelector("a")?.textContent
            if(!otherName) {
                return {ok: false, err: new Error(`Tag[${i}]: tag other name is empty.`) }
            }
            tags.push({code: name, name, otherName, type: "tag"})
        }else if(subSpanList.length === 1) {
            const name = subSpanList[0].querySelector("a")?.textContent
            if(!name) {
                return {ok: false, err: new Error(`Tag[${i}]: tag name is empty.`) }
            }
            tags.push({code: name, name, type: "tag"})
        }else{
            return {ok: false, err: new Error(`Tag[${i}]: cannot analyse tag. Span has 0 sub span.`) }
        }
    } 

    let description: string | undefined
    const descriptionMeta = document.querySelector("meta[property=\"og:description\"]") as HTMLMetaElement | null
    if(descriptionMeta !== null) {
        description = descriptionMeta.content
    }else{
        const descriptionDiv = document.querySelector("figcaption h1 + div") as HTMLDivElement | null
        if(descriptionDiv !== null && descriptionDiv.textContent !== null) {
            description = descriptionDiv.textContent
        }
    }

    let title: string | undefined
    const titleHeading = document.querySelector("figcaption h1") as HTMLHeadingElement | null
    if(titleHeading !== null && titleHeading.textContent !== null) {
        title = titleHeading.textContent
    }

    return {
        ok: true,
        value: {tags, title, description}
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