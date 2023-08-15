import { session } from "../../functions/storage"

document.addEventListener("DOMContentLoaded", () => {
    loadGalleryPageHash()
})

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
        session.reflect.ehentaiGalleryImageHash.set({gid, page}, {imageHash})
    }
}