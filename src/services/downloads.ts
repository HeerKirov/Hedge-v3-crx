import { session } from "../functions/storage"

export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const { filename, url, referrer } = downloadItem
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(filename)
    
    if(!extension || !INCLUDE_EXTENSIONS.includes(extension)) {
        suggest()
        return
    }

    for(const rule of MATCH_RULES) {
        const args: Record<string, string> = {}
        if(rule.referrer) {
            const referrerMatches = rule.referrer.exec(referrer)
            if(referrerMatches && referrerMatches.groups) {
                Object.entries(referrerMatches.groups).forEach(([k, v]) => args[k] = v)
            }else{
                continue
            }
        }
        if(rule.url) {
            const urlMatches = rule.url.exec(url)
            if(urlMatches && urlMatches.groups) {
                Object.entries(urlMatches.groups).forEach(([k, v]) => args[k] = v)
            }else{
                continue
            }
        }
        if(rule.filename) {
            const filenameMatches = rule.filename.exec(filenameWithoutExt)
            if(filenameMatches && filenameMatches.groups) {
                Object.entries(filenameMatches.groups).forEach(([k, v]) => args[k] = v)
            }else{
                continue
            }
        }

        if(rule.processor) {
            rule.processor(args).then(args => {
                if(args !== null) {
                    const finalName = Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), rule.rename)
                    suggest({filename: finalName + (extension ? "." + extension : "")})
                }else{
                    suggest()
                }
            })
            return true
        }else{
            const finalName = Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), rule.rename)
            suggest({filename: finalName + (extension ? "." + extension : "")})
        }    
    }
}

function splitNameAndExtension(filename: string): [string, string | null] {
    const i = filename.lastIndexOf(".")
    return i >= 0 ? [filename.substring(0, i), filename.substring(i + 1)] : [filename, null]
}

const INCLUDE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "ogv"]

interface MatchRule {
    referrer?: RegExp
    url?: RegExp
    filename?: RegExp
    rename: string
    processor?(args: Record<string, string>): Promise<Record<string, string> | null>
}

const MATCH_RULES: MatchRule[] = [
    {
        referrer: /https:\/\/chan.sankakucomplex.com\/post\/show\/(?<MD5>\S+)/,
        rename: "sankakucomplex_$<PID>",
        processor: sankakucomplexProcessor
    },
    {
        referrer: /https:\/\/idol.sankakucomplex.com\/post\/show\/(?<PID>\d+)/,
        rename: "idolcomplex_$<PID>"
    },
    {
        url: /https:\/\/e-hentai.org\/fullimg.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: ehentaiOriginalProcessor
    },
    {
        referrer: /https:\/\/e-hentai.org\/$/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: ehentaiSaveAsProcessor
    },
    {
        referrer: /https:\/\/pixiv.net\/$/,
        filename: /(?<PID>\d+)_p(?<PAGE>\d+)/,
        rename: "pixiv_$<PID>_$<PAGE>"
    },
    {
        referrer: /https:\/\/gelbooru.com\/index.php\?.*id=(?<PID>\d+)/,
        rename: "gelbooru_$<PID>"
    }
]

async function sankakucomplexProcessor(args: Record<string, string>): Promise<Record<string, string> | null> {
    //在Post页面保存文件。其referrer可解析，能从中获得md5值。
    //保存时需要使用pid，因此还需要获取pid。
    const md5 = args["MD5"]
    //首先尝试从session缓存中获取数据
    const data = await session.reflect.sankakuPostId({md5})
    if(data !== undefined) {
        return {
            "PID": data.pid
        }
    }else{
        //如果session缓存没有数据，则自行尝试在tabs中搜索
        const tabs = await chrome.tabs.query({currentWindow: true, url: `https://chan.sankakucomplex.com/post/show/${md5}`})
        for(const tab of tabs) {
            if(tab.url) {
                const url = new URL(tab.url)
                const res = /\/post\/show\/(?<MD5>\S+)/.exec(url.pathname)
                if(res && res.groups && res.groups["MD5"] === md5) {
                    const query = new URLSearchParams(url.hash)
                    const pid = query.get("PID")
                    if(pid !== null) {
                        return {
                            "PID": pid
                        }
                    }else{
                        console.log(`[sankakucomplexProcessor] Found chan.sankakucomplex.com/post/show/${md5} tab, but PID not exist in hash.`)
                        return null
                    }
                }
            }
        }

        console.log(`[sankakucomplexProcessor] Cannot find chan.sankakucomplex.com/post/show/${md5} tab.`)
        return null
    }
}

async function ehentaiOriginalProcessor(args: Record<string, string>): Promise<Record<string, string> | null> {
    //点击“下载原始文件”时的下载项。其url可解析，能从中获得galleryId, pageNum。
    //为了补全信息，还需要获取imageHash。
    const gid = args["GID"]
    const page = args["PAGE"]
    //首先尝试从session缓存中获取数据
    const data = await session.reflect.ehentaiGalleryImageHash({gid, page})
    if(data !== undefined) {
        return {
            "GID": gid,
            "PAGE": page,
            "PHASH": data.imageHash
        }
    }else{
        //如果session缓存没有数据，则自行尝试在tabs中搜索
        const tabs = await chrome.tabs.query({currentWindow: true, url: `https://e-hentai.org/s/*/${gid}-${page}*`})
        const re = /https:\/\/e-hentai.org\/s\/(?<PHASH>\S+)\/(?<GID>\d+)-(?<PAGE>\d+)/
        for(const tab of tabs) {
            if(tab.url) {
                const res = re.exec(tab.url)
                if(res && res.groups && res.groups["GID"] === gid && res.groups["PAGE"] === page) {
                    const pHash = res.groups["PHASH"]
                    return {
                        "GID": gid,
                        "PAGE": page,
                        "PHASH": pHash
                    }
                }
            }
        }

        console.log(`[ehentaiOriginalProcessor] Cannot find e-hentai.org/s/${gid}-${page} tab.`)
        return null
    }
}

async function ehentaiSaveAsProcessor(_: Record<string, string>): Promise<Record<string, string> | null> {
    //右键另存为图片，这种下载方式无法从下载项中获取任何有效信息。
    //解决思路是利用“下载时一定位于当前页面”的巧合，将当前激活页面当作原始页。当然这也限制了在保存之前不能随意切换tab。
    //从URL就能获取所需的imageHash, galleryId, pageNum。
    const tabs = await chrome.tabs.query({currentWindow: true, active: true, url: "https://e-hentai.org/s/*/*"})
    if(tabs.length > 0 && tabs[0].url !== undefined) {
        const re = /https:\/\/e-hentai.org\/s\/(?<PHASH>\S+)\/(?<GID>\d+)-(?<PAGE>\d+)/
        const res = re.exec(tabs[0].url)
        if(res && res.groups) {
            const gid = res.groups["GID"]
            const page = res.groups["PAGE"]
            const pHash = res.groups["PHASH"]
            return {
                "GID": gid,
                "PAGE": page,
                "PHASH": pHash
            }
        }else{
            console.error(`[ehentaiSaveAsProcessor] Cannot analyse active tab url [${tabs[0].url}].`)
        }
    }else{
        console.error("[ehentaiSaveAsProcessor] Cannot find active e-hentai.org/s tab.")
    }
    return null
}