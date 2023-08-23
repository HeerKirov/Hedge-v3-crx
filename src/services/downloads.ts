import { server } from "@/functions/server"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { sendMessageToTab } from "@/functions/messages"
import { DOWNLOAD_EXTENSIONS, DOWNLOAD_RENAME_SITES, SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"

/**
 * 功能：文件下载重命名建议模块。
 * 按照既定的规则解析某些来源的下载，然后给出建议的重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const { filename, url, referrer } = downloadItem
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(filename)

    settings.get().then(async setting => {
        if(!extension || !getFinalExtensions(setting).includes(extension)) {
            suggest()
            return
        }
    
        const result = matchRulesAndArgs(referrer, url, filenameWithoutExt, setting)
        if(result === null) {
            suggest()
            return
        }
        if(result.processor) {
            const finalArgs = await MATCH_PROCESSORS[result.processor](result.args)
            if(finalArgs === null) {
                suggest()
                return
            }
            suggest({filename: replaceWithArgs(result.rename, finalArgs) + (extension ? "." + extension : "")})
            collectSourceData(result.siteName, finalArgs, setting)
        }else{
            suggest({filename: replaceWithArgs(result.rename, result.args) + (extension ? "." + extension : "")})
            collectSourceData(result.siteName, result.args, setting)
        }
    })

    return true
}

/**
 * 功能：文件下载附带功能启动模块。
 * 文件开始下载时，启动其来源数据的下载机制。
 */
async function collectSourceData(siteName: string, args: Record<string, string>, setting: Setting) {
    const rule = SOURCE_DATA_COLLECT_SITES[siteName]
    if(rule === undefined) {
        console.log(`[collectSourceData] '${siteName}' no this rule, skip.`)
        //没有对应名称的规则，因此跳过
        return
    }
    const overrideRule = setting.sourceData.overrideRules[siteName]
    if(overrideRule && !overrideRule.enable) {
        console.log(`[collectSourceData] '${siteName}' is disabled, skip.`)
        //该规则已被禁用，因此跳过
        return
    }
    const { pattern, sourceId: sourceIdPattern } = SOURCE_DATA_RULES[siteName]

    const sourceSite = (overrideRule ?? rule).sourceSite
    const sourceId = parseInt(args[sourceIdPattern])
    if(isNaN(sourceId)) {
        console.error(`[collectSourceData] ${sourceSite}-${args[sourceIdPattern]} source id analyse failed.`)
        return
    }
    if(await sessions.cache.sourceDataCollected.get({site: sourceSite, sourceId})) {
        console.log(`[collectSourceData] ${sourceSite}-${sourceId} cached, skip.`)
        //该条数据近期被保存过，因此跳过
        return 
    }

    const retrieve = await server.sourceData.get({sourceSite: sourceSite, sourceId})
    if(retrieve.ok) {
        if(retrieve.data.status === "IGNORED") {
            //已忽略的数据，不收集
            sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
            console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is IGNORED, skip collecting.`)
            return
        }else if(retrieve.data.status === "EDITED") {
            const lastUpdateTime = Date.parse(retrieve.data.updateTime)
            if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                //EDITED状态，依据上次更新时间，在7天以内的不收集
                sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
                console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is edited in 7 days, skip collecting.`)
                return
            }
        }
    }else if(retrieve.exception.code !== "NOT_FOUND") {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 在访问数据时报告了一项错误。请查看扩展或核心服务日志。`
        })
        console.warn(`[collectSourceData] Source data ${sourceSite}-${sourceId} retrieve failed: ${retrieve.exception.message}`)
        return
    }

    const pageURL = replaceWithArgs(pattern, args)
    const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
    if(tabs.length <= 0 || tabs[0].id === undefined) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 未找到用于提取数据的页面。`
        })
        console.warn(`[collectSourceData] Page '${pageURL}' not found.`)
        return
    }

    const reportResult = await sendMessageToTab(tabs[0].id, "REPORT_SOURCE_DATA", undefined)
    if(!reportResult.ok) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 在提取页面收集数据时发生错误。请查看扩展日志。`
        })
        console.error(`[collectSourceData] Page '${pageURL}' failed to collect source data.`, reportResult.err)
        return
    }
    const res = await server.sourceData.bulk([{...reportResult.value, sourceSite, sourceId}])
    if(!res.ok) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 数据未能成功写入。请查看扩展或核心服务日志。`
        })
        console.error(`[collectSourceData] Source data ${sourceSite}-${sourceId} upload failed: ${res.exception.message}`)
        return
    }

    sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)

    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} collected.`)
}

/**
 * 将文件名分隔为不包含扩展名的名称部分和扩展名。
 */
function splitNameAndExtension(filename: string): [string, string | null] {
    const i = filename.lastIndexOf(".")
    return i >= 0 ? [filename.substring(0, i), filename.substring(i + 1)] : [filename, null]
}

/**
 * 对给出的项，逐规则进行匹配，发现完成匹配的规则，返回此规则与匹配获得的参数。
 */
function matchRulesAndArgs(referrer: string, url: string, filename: string, setting: Setting): {siteName: string, rename: string, processor: string | undefined, args: Record<string, string>} | null {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches && matches.groups) {
            Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of DOWNLOAD_RENAME_RULES) {
        const site = DOWNLOAD_RENAME_SITES[rule.siteName]
        const overrideRule = setting.download.overrideRules[rule.siteName]
        if(overrideRule && !overrideRule.enable) {
            //跳过被禁用的规则
            continue
        }

        const args: Record<string, string> = {}
        if(rule.referrer && !match(rule.referrer, referrer, args)) continue
        if(rule.url && !match(rule.url, url, args)) continue
        if(rule.filename && !match(rule.filename, filename, args)) continue

        return {siteName: rule.siteName, rename: overrideRule?.rename ?? site.rename, processor: rule.processor, args}
    }
    for(const rule of setting.download.customRules) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(new RegExp(rule.referrer), referrer, args)) continue
        if(rule.url && !match(new RegExp(rule.url), url, args)) continue
        if(rule.filename && !match(new RegExp(rule.filename), filename, args)) continue

        return {siteName: "<custom>", rename: rule.rename, processor: undefined, args}
    }
    
    return null
}

/**
 * 替换模板中的所有参数，生成字符串。
 */
function replaceWithArgs(template: string, args: Record<string, string>): string {
    return Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), template)
}

/**
 * 获得最终扩展名列表。
 */
function getFinalExtensions(setting: Setting): string[] {
    return setting.download.customExtensions.length ? [...DOWNLOAD_EXTENSIONS, ...setting.download.customExtensions] : DOWNLOAD_EXTENSIONS
}

const MATCH_PROCESSORS: Readonly<Record<string, (args: Record<string, string>) => Promise<Record<string, string> | null>>> = {
    async "sankakucomplex"(args) {
        //在Post页面保存文件。其referrer可解析，能从中获得md5值。
        //保存时需要使用pid，因此还需要获取pid。
        const md5 = args["MD5"]
        //首先尝试从session缓存中获取数据
        const data = await sessions.reflect.sankakuPostId.get({md5})
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
    },
    async "ehentai-original"(args) {
        //点击“下载原始文件”时的下载项。其url可解析，能从中获得galleryId, pageNum。
        //为了补全信息，还需要获取imageHash。
        const gid = args["GID"]
        const page = args["PAGE"]
        //首先尝试从session缓存中获取数据
        const data = await sessions.reflect.ehentaiGalleryImageHash.get({gid, page})
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
    },
    async "ehentai-save-image"(_) {
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
}

const DOWNLOAD_RENAME_RULES: Readonly<MatchRule[]> = [
    {
        siteName: "sankakucomplex",
        referrer: /https:\/\/chan.sankakucomplex.com\/post\/show\/(?<MD5>\S+)/,
        processor: "sankakucomplex"
    },
    {
        siteName: "ehentai",
        url: /https:\/\/e-hentai.org\/fullimg.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        processor: "ehentai-original"
    },
    {
        siteName: "ehentai",
        referrer: /https:\/\/e-hentai.org\/$/,
        processor: "ehentai-save-image"
    },
    {
        siteName: "pixiv",
        referrer: /https:\/\/pixiv.net\/$/,
        filename: /(?<PID>\d+)_p(?<PAGE>\d+)/
    },
    {
        siteName: "gelbooru",
        referrer: /https:\/\/gelbooru.com\/index.php\?.*id=(?<PID>\d+)/
    },
    {
        siteName: "idolcomplex",
        referrer: /https:\/\/idol.sankakucomplex.com\/post\/show\/(?<PID>\d+)/
    },
]

const SOURCE_DATA_RULES: Record<string, SourceDataRule> = {
    "sankakucomplex": {
        sourceId: "PID",
        pattern: "https://chan.sankakucomplex.com/post/show/$<MD5>",
    },
    "ehentai": {
        sourceId: "GID",
        pattern: "https://e-hentai.org/g/*/$<GID>",
    },
    "pixiv": {
        sourceId: "PID",
        pattern: "https://pixiv.net/artworks/$<PID>",
    }
}

interface MatchRule {
    siteName: string
    referrer?: RegExp
    url?: RegExp
    filename?: RegExp
    processor?: string
}

interface SourceDataRule {
    sourceId: string
    pattern: string
}
