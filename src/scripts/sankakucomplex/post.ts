import { session } from "../../functions/storage"

document.addEventListener("DOMContentLoaded", () => {
    loadPostId()
    enableBookEnhancement()
    enableImageLinkReplacement()
})

/**
 * 在URL添加PID，并将PID信息保存到session。
 * legacy的post页面的PID已经被换成了MD5。这真的很难用。把PID添加回去能方便一点，尽管是添加到hash。
 */
function loadPostId() {
    const meta = document.querySelector('meta[property="og:title"]')
    if(meta && (meta as HTMLMetaElement).content.startsWith("Post")) {
        const pid = parseInt((meta as HTMLMetaElement).content.substring("Post".length))
        document.location.hash = `PID=${pid}`
        const res = /\/post\/show\/(?<MD5>\S+)/.exec(document.location.pathname)
        if(res && res.groups) {
            const md5 = res.groups["MD5"]
            session.reflect.sankakuPostId({md5}, {pid: pid.toString()})
        }
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