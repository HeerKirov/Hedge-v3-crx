
document.addEventListener("DOMContentLoaded", () => {
    enableShowPID()
    enableBookEnhancement()
    //processImageLinkReplacement()
})

/**
 * 功能：在URL添加PID
 * legacy的post页面的PID已经被换成了MD5。这真的很难用。把PID添加回去能方便一点，尽管是添加到hash。
 */
function enableShowPID() {
    const meta = document.querySelector('meta[property="og:title"]')
    if(meta && (meta as HTMLMetaElement).content.startsWith("Post")) {
        const realPID = parseInt((meta as HTMLMetaElement).content.substring("Post".length))
        document.location.hash = `PID=${realPID}`
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
function processImageLinkReplacement() {
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