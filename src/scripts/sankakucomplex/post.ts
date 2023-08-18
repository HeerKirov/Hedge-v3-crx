import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "../../functions/server/api-source-data"
import { sessions } from "@/functions/storage"
import { Result } from "@/utils/primitives"
import { receiveMessage } from "@/scripts/messages"
import { settings } from "@/functions/setting"

document.addEventListener("DOMContentLoaded", async () => {
    loadPostMD5()
    const setting = await settings.get()
    if(setting.tool.sankakucomplex.enableAddPostId) enableAddPostId()
    if(setting.tool.sankakucomplex.enableBookEnhancement) enableBookEnhancement()
    if(setting.tool.sankakucomplex.enableImageLinkReplacement) enableImageLinkReplacement()
})

chrome.runtime.onMessage.addListener(receiveMessage(({ type, msg, callback }) => {
    console.log(type, msg, callback)
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }
}))

/**
 * 加载post image数据。将post MD5信息保存到session。
 */
function loadPostMD5() {
    const meta = document.querySelector("meta[property=\"og:title\"]")
    if(meta && (meta as HTMLMetaElement).content.startsWith("Post")) {
        const pid = parseInt((meta as HTMLMetaElement).content.substring("Post".length))
        const res = /\/post\/show\/(?<MD5>\S+)/.exec(document.location.pathname)
        if(res && res.groups) {
            const md5 = res.groups["MD5"]
            sessions.reflect.sankakuPostId.set({md5}, {pid: pid.toString()})
        }
    }
}

/**
 * 在URL添加PID，并将PID信息保存到session。
 * legacy的post页面的PID已经被换成了MD5。这真的很难用。把PID添加回去能方便一点，尽管是添加到hash。
 */
function enableAddPostId() {
    const meta = document.querySelector("meta[property=\"og:title\"]")
    if(meta && (meta as HTMLMetaElement).content.startsWith("Post")) {
        const pid = parseInt((meta as HTMLMetaElement).content.substring("Post".length))
        document.location.hash = `PID=${pid}`
    }
}

/**
 * 功能：增强Book清单
 * legacy的post页面的Book清单只能通向beta Book。把legacy的加回去。
 */
function enableBookEnhancement() {
    const statusNotice = document.querySelectorAll(".content .status-notice")
    if(statusNotice.length) {
        statusNotice.forEach(sn => {
            if(sn.id.startsWith("pool")) {
                const bookId = sn.id.slice("pool".length)
                const legacyA = document.createElement("a")
                legacyA.href = `https://chan.sankakucomplex.com/pool/show/${bookId}`
                legacyA.text = `Legacy pool: ${bookId}`
                sn.append("(")
                sn.appendChild(legacyA)
                sn.append(")")
            }
        })
    }
}

/**
 * 功能：Image链接替换
 * image的链接有s开头和v开头两种。之前曾经存在过问题，v开头链接经常下载异常，导致需要把v开头替换成s开头。
 */
function enableImageLinkReplacement() {
    const imageLink = document.getElementById("image-link") as HTMLAnchorElement | null
    if(imageLink) {
        if(imageLink.href && imageLink.href.startsWith("https://v")) {
            console.log(`[ImageLinkReplacement] Replaced #image-link from v to s.`)
            imageLink.href = "https://s" + imageLink.href.substring("https://v".length)
        }
        const imageLinkImg = imageLink.getElementsByTagName("img")[0] as HTMLImageElement | undefined
        if(imageLinkImg && imageLinkImg.src && imageLinkImg.src.startsWith("https://v")) {
            console.log(`[ImageLinkReplacement] Replaced #image-link > img from v to s.`)
            imageLinkImg.src = "https://s" + imageLinkImg.src.substring("https://v".length)
        }
    }else{
        console.warn("[ImageLinkReplacement] Cannot find #image-link.")
    }
}

/**
 * 功能：收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, Error> {
    const tags: SourceTagForm[] = []
    const tagLiList = document.querySelectorAll("#tag-sidebar li")
    for(let i = 0; i < tagLiList.length; ++i) {
        const tagLi = tagLiList[i]
        const tag: SourceTagForm = {code: "", name: "", otherName: "", type: ""}
        if(tagLi.className.startsWith("tag-type-")) {
            tag.type = tagLi.className.substring("tag-type-".length)
        }else{
            return {ok: false, err: new Error(`Tag[${i}]: cannot infer tag type from its class '${tagLi.className}'.`) }
        }
        const tagAnchor = tagLi.querySelector("div > a[itemprop=\"keywords\"]")
        if(tagAnchor !== null && tagAnchor.textContent !== null) {
            tag.name = tagAnchor.textContent.replace("_", " ")
            tag.code = tag.name
        }else{
            return {ok: false, err: new Error(`Tag[${i}]: Cannot find its anchor.`) }
        }
        const childNodes = tagLi.querySelector("div > .tooltip > span")?.childNodes ?? []
        for(const childNode of childNodes) {
            if(childNode.textContent !== null && childNode.nodeName === "#text" && childNode.textContent.startsWith("日本語:")) {
                tag.otherName = childNode.textContent.substring("日本語:".length).trim()
                break
            }
        }
        tags.push(tag)
    }

    const additionalInfo: SourceAdditionalInfoForm[] = []
    const res = /\/post\/show\/(?<MD5>\S+)/.exec(document.location.pathname)
    if(res && res.groups) {
        const md5 = res.groups["MD5"]
        additionalInfo.push({field: "md5", value: md5})
    }
    
    //TODO collect books & relations

    return {
        ok: true,
        value: {
            tags,
            additionalInfo
        }
    }
}