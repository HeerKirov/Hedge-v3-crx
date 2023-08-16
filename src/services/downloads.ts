import { server } from "@/functions/server"
import { session } from "@/functions/storage"
import { sendMessageToTab } from "@/services/messages"

/**
 * 功能：文件下载重命名建议模块。
 * 按照既定的规则解析某些来源的下载，然后给出建议的重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const { filename, url, referrer } = downloadItem
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(filename)
    
    if(!extension || !INCLUDE_EXTENSIONS.includes(extension)) {
        suggest()
        return
    }

    const result = matchRulesAndArgs(referrer, url, filenameWithoutExt)
    if(result === null) {
        suggest()
        return
    }

    const { rule, args } = result
    if(rule.processor) {
        rule.processor(args).then(args => {
            if(args !== null) {
                suggest({filename: getFinalName(rule.rename, extension, args)})
                collectSourceData(rule.ruleName, args)
            }else{
                suggest()
            }
        })
        return true
    }else{
        suggest({filename: getFinalName(rule.rename, extension, args)})
        collectSourceData(rule.ruleName, args)
    }   
}

/**
 * 功能：文件下载附带功能启动模块。
 * 文件开始下载时，启动其来源数据的下载机制。
 */
export async function collectSourceData(ruleName: string, args: Record<string, string>) {
    const rule = SOURCE_DATA_RULES.find(r => r.ruleName === ruleName)
    if(rule === undefined) {
        console.log(`[collectSourceData] '${ruleName}' no this rule, skip.`)
        //没有对应名称的规则，因此跳过
        return
    }
    const sourceId = replaceWithArgs(rule.sourceId, args)
    if(await session.cache.sourceDataCollected.get({site: rule.sourceSite, sourceId})) {
        console.log(`[collectSourceData] ${rule.sourceSite}-${sourceId} cached. skip.`)
        //该条数据近期被保存过，因此跳过
        return 
    }
    const retrieve = await server.sourceData.get({sourceSite: rule.sourceSite, sourceId: parseInt(sourceId)})
    if(retrieve.ok) {
        if(retrieve.data.status === "IGNORED") {
            //已忽略的数据，不收集
            session.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
            console.log(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} is IGNORED, skip collecting.`)
            return
        }else if(retrieve.data.status === "EDITED") {
            const lastUpdateTime = Date.parse(retrieve.data.updateTime)
            if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                //EDITED状态，依据上次更新时间，在7天以内的不收集
                session.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
                console.log(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} is edited in 7 days, skip collecting.`)
                return
            }
        }
    }else if(retrieve.exception.code == "NOT_FOUND") {
        //TODO 这是一项应该在UI报告的警告，告知用户可能存在未收集的数据
        console.warn(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} retrieve failed: ${retrieve.exception.message}`)
        return
    }

    const pageURL = replaceWithArgs(rule.pattern, args)
    const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
    if(tabs.length <= 0 || tabs[0].id === undefined) {
        //TODO 这是一项应该在UI报告的警告，告知用户可能存在未收集的数据
        console.warn(`[collectSourceData] Page '${pageURL}' not found.`)
        return
    }

    const reportResult = await sendMessageToTab(tabs[0].id, "REPORT_SOURCE_DATA", undefined)
    if(!reportResult.ok) {
        //TODO 这是一项应该在UI报告的警告，告知用户可能存在未收集的数据
        console.warn(`[collectSourceData] Page '${pageURL}' failed to collect source data.`)
        return
    }
    const res = await server.sourceData.bulk([{...reportResult.value, sourceSite: rule.sourceSite, sourceId: parseInt(sourceId)}])
    if(!res.ok) {
        //TODO 这是一项应该在UI报告的警告，告知用户可能存在未收集的数据
        console.warn(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} upload failed: ${res.exception.message}`)
        return
    }

    session.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
    
    //TODO 数据收集已完成。在active Tab提示用户收集成功
    console.log(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} collected.`)
}

function splitNameAndExtension(filename: string): [string, string | null] {
    const i = filename.lastIndexOf(".")
    return i >= 0 ? [filename.substring(0, i), filename.substring(i + 1)] : [filename, null]
}

function matchRulesAndArgs(referrer: string, url: string, filename: string): {rule: MatchRule, args: Record<string, string>} | null {
    for(let i = 0; i < MATCH_RULES.length; ++i) {
        const rule = MATCH_RULES[i]
        const args: Record<string, string> = {}
        //对rules做匹配。当某条rule的所有列出条件都得到满足时，认为这条rule符合匹配。
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
            const filenameMatches = rule.filename.exec(filename)
            if(filenameMatches && filenameMatches.groups) {
                Object.entries(filenameMatches.groups).forEach(([k, v]) => args[k] = v)
            }else{
                continue
            }
        }
        return {rule, args}
    }
    return null
}

function replaceWithArgs(template: string, args: Record<string, string>): string {
    return Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), template)
}

function getFinalName(rename: string, extension: string, args: Record<string, string>): string {
    return replaceWithArgs(rename, args) + (extension ? "." + extension : "")
}

const INCLUDE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "ogv"]

const MATCH_RULES: MatchRule[] = [
    {
        ruleName: "sankakucomplex",
        referrer: /https:\/\/chan.sankakucomplex.com\/post\/show\/(?<MD5>\S+)/,
        rename: "sankakucomplex_$<PID>",
        processor: sankakucomplexProcessor
    },
    {
        ruleName: "ehentai",
        url: /https:\/\/e-hentai.org\/fullimg.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: ehentaiOriginalProcessor
    },
    {
        ruleName: "ehentai",
        referrer: /https:\/\/e-hentai.org\/$/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: ehentaiSaveAsProcessor
    },
    {
        ruleName: "pixiv",
        referrer: /https:\/\/pixiv.net\/$/,
        filename: /(?<PID>\d+)_p(?<PAGE>\d+)/,
        rename: "pixiv_$<PID>_$<PAGE>"
    },
    {
        ruleName: "gelbooru",
        referrer: /https:\/\/gelbooru.com\/index.php\?.*id=(?<PID>\d+)/,
        rename: "gelbooru_$<PID>"
    },
    {
        ruleName: "idolcomplex",
        referrer: /https:\/\/idol.sankakucomplex.com\/post\/show\/(?<PID>\d+)/,
        rename: "idolcomplex_$<PID>"
    },
]

const SOURCE_DATA_RULES: SourceDataRule[] = [
    {
        ruleName: "sankakucomplex",
        sourceSite: "sankakucomplex",
        sourceId: "$<PID>",
        pattern: "https://chan.sankakucomplex.com/post/show/$<MD5>"
    },
    {
        ruleName: "ehentai",
        sourceSite: "ehentai",
        sourceId: "$<GID>",
        pattern: "https://e-hentai.org/g/*/$<GID>"
    },
    {
        ruleName: "pixiv",
        sourceSite: "pixiv",
        sourceId: "$<PID>",
        pattern: "https://pixiv.net/artworks/$<PID>"
    }
]

interface MatchRule {
    ruleName: string
    referrer?: RegExp
    url?: RegExp
    filename?: RegExp
    rename: string
    processor?(args: Record<string, string>): Promise<Record<string, string> | null>
}

interface SourceDataRule {
    ruleName: string
    sourceSite: string
    sourceId: string
    pattern: string
}

async function sankakucomplexProcessor(args: Record<string, string>): Promise<Record<string, string> | null> {
    //在Post页面保存文件。其referrer可解析，能从中获得md5值。
    //保存时需要使用pid，因此还需要获取pid。
    const md5 = args["MD5"]
    //首先尝试从session缓存中获取数据
    const data = await session.reflect.sankakuPostId.get({md5})
    if(data !== undefined) {
        return {
            "MD5": md5,
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
                            "MD5": md5,
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
    const data = await session.reflect.ehentaiGalleryImageHash.get({gid, page})
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
    //解决思路是利用“下载时一定位于当前页面”的巧合，将当前激活页面当作原始页。因此，这也限制了在保存之前不能随意切换tab。
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