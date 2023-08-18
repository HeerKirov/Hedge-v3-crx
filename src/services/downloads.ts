import { server } from "@/functions/server"
import { settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { sendMessageToTab } from "@/services/messages"
import { arrays, objects } from "@/utils/primitives"

/**
 * 功能：文件下载重命名建议模块。
 * 按照既定的规则解析某些来源的下载，然后给出建议的重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const { filename, url, referrer } = downloadItem
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(filename)

    getSettingRules().then(async setting => {
        if(!extension || !setting.extensions.includes(extension)) {
            suggest()
            return
        }
    
        const result = matchRulesAndArgs(referrer, url, filenameWithoutExt, setting.matchRules)
        if(result === null) {
            suggest()
            return
        }
    
        const { rule, args } = result
        if(rule.processor) {
            const finalArgs = await MATCH_PROCESSORS[rule.processor](args)
            if(finalArgs === null) {
                suggest()
                return
            }
            suggest({filename: replaceWithArgs(rule.rename, finalArgs) + (extension ? "." + extension : "")})
            collectSourceData(rule.ruleName, finalArgs, setting.sourceDataRules)
        }else{
            suggest({filename: replaceWithArgs(rule.rename, args) + (extension ? "." + extension : "")})
            collectSourceData(rule.ruleName, args, setting.sourceDataRules)
        }
    })

    return true
}

/**
 * 加载规则。
 */
async function getSettingRules() {
    const setting = await settings.get()

    function mergeDownloadRule(): MatchRule[] {
        const ret: MatchRule[] = []
        for(const rule of MATCH_RULES) {
            const overrideRule = setting.download.overrideRules[rule.ruleName]
            if(overrideRule) {
                if(!overrideRule.enable) continue
                ret.push({
                    ruleName: rule.ruleName,
                    referrer: rule.referrer,
                    url: rule.url,
                    filename: rule.filename,
                    rename: overrideRule.rename || rule.rename,
                    processor: rule.processor
                })
            }else{
                ret.push(rule)
            }
        }
        for(const rule of setting.download.customRules) {
            ret.push({
                ruleName: "<custom rule>",
                referrer: rule.referrer ? new RegExp(rule.referrer) : undefined,
                url: rule.url ? new RegExp(rule.url) : undefined,
                filename: rule.filename ? new RegExp(rule.filename) : undefined,
                rename: rule.rename
            })
        }
        return ret
    }
    function mergeSourceDataRule(): SourceDataRule[] {
        const ret: SourceDataRule[] = []
        for(const rule of SOURCE_DATA_RULES) {
            const overrideRule = setting.sourceData.overrideRules[rule.ruleName]
            if(overrideRule) {
                if(!overrideRule.enable) continue
                ret.push({
                    ruleName: rule.ruleName,
                    sourceSite: overrideRule.sourceSite || rule.sourceSite,
                    sourceId: rule.sourceId,
                    pattern: rule.pattern,
                    additionalInfo: overrideRule.additionalInfo.length ? overrideRule.additionalInfo : rule.additionalInfo
                })
            }else{
                ret.push(rule)
            }
        }

        return ret
    }
    function mergeExtensions(): string[] {
        return setting.download.customExtensions.length ? [...INCLUDE_EXTENSIONS, ...setting.download.customExtensions] : INCLUDE_EXTENSIONS
    }

    return {extensions: mergeExtensions(), matchRules: mergeDownloadRule(), sourceDataRules: mergeSourceDataRule()}
}

/**
 * 功能：文件下载附带功能启动模块。
 * 文件开始下载时，启动其来源数据的下载机制。
 */
async function collectSourceData(ruleName: string, args: Record<string, string>, sourceDataRules: SourceDataRule[]) {
    const rule = sourceDataRules.find(r => r.ruleName === ruleName)
    if(rule === undefined) {
        console.log(`[collectSourceData] '${ruleName}' no this rule, skip.`)
        //没有对应名称的规则，因此跳过
        return
    }
    const sourceId = parseInt(args[rule.sourceId])
    if(isNaN(sourceId)) {
        console.error(`[collectSourceData] ${rule.sourceSite}-${args[rule.sourceId]} source id analyse failed.`)
        return
    }
    if(await sessions.cache.sourceDataCollected.get({site: rule.sourceSite, sourceId})) {
        console.log(`[collectSourceData] ${rule.sourceSite}-${sourceId} cached, skip.`)
        //该条数据近期被保存过，因此跳过
        return 
    }
    const retrieve = await server.sourceData.get({sourceSite: rule.sourceSite, sourceId})
    if(retrieve.ok) {
        if(retrieve.data.status === "IGNORED") {
            //已忽略的数据，不收集
            sessions.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
            console.log(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} is IGNORED, skip collecting.`)
            return
        }else if(retrieve.data.status === "EDITED") {
            const lastUpdateTime = Date.parse(retrieve.data.updateTime)
            if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                //EDITED状态，依据上次更新时间，在7天以内的不收集
                sessions.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
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
    const res = await server.sourceData.bulk([{...reportResult.value, sourceSite: rule.sourceSite, sourceId}])
    if(!res.ok) {
        //TODO 这是一项应该在UI报告的警告，告知用户可能存在未收集的数据
        console.error(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} upload failed: ${res.exception.message}`)
        return
    }

    sessions.cache.sourceDataCollected.set({site: rule.sourceSite, sourceId}, true)
    
    //TODO 数据收集已完成。在active Tab提示用户收集成功
    console.log(`[collectSourceData] Source data ${rule.sourceSite}-${sourceId} collected.`)
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
function matchRulesAndArgs(referrer: string, url: string, filename: string, rules: MatchRule[]): {rule: MatchRule, args: Record<string, string>} | null {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches && matches.groups) {
            Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of rules) {
        const args: Record<string, string> = {}
        //对rules做匹配。当某条rule的所有列出条件都得到满足时，认为这条rule符合匹配。
        if(rule.referrer && !match(rule.referrer, referrer, args)) continue
        if(rule.url && !match(rule.url, url, args)) continue
        if(rule.filename && !match(rule.filename, filename, args)) continue

        return {rule, args}
    }
    
    return null
}

/**
 * 替换模板中的所有参数，生成字符串。
 */
function replaceWithArgs(template: string, args: Record<string, string>): string {
    return Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), template)
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

const MATCH_RULES: Readonly<MatchRule[]> = [
    {
        ruleName: "sankakucomplex",
        referrer: /https:\/\/chan.sankakucomplex.com\/post\/show\/(?<MD5>\S+)/,
        rename: "sankakucomplex_$<PID>",
        processor: "sankakucomplex"
    },
    {
        ruleName: "ehentai",
        url: /https:\/\/e-hentai.org\/fullimg.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: "ehentai-original"
    },
    {
        ruleName: "ehentai",
        referrer: /https:\/\/e-hentai.org\/$/,
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>",
        processor: "ehentai-save-image"
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

const SOURCE_DATA_RULES: Readonly<SourceDataRule[]> = [
    {
        ruleName: "sankakucomplex",
        sourceSite: "sankakucomplex",
        sourceId: "PID",
        pattern: "https://chan.sankakucomplex.com/post/show/$<MD5>",
        additionalInfo: [{key: "md5", additionalField: "md5"}]
    },
    {
        ruleName: "ehentai",
        sourceSite: "ehentai",
        sourceId: "GID",
        pattern: "https://e-hentai.org/g/*/$<GID>",
        additionalInfo: [{key: "token", additionalField: "token"}]
    },
    {
        ruleName: "pixiv",
        sourceSite: "pixiv",
        sourceId: "PID",
        pattern: "https://pixiv.net/artworks/$<PID>",
        additionalInfo: []
    }
]

export const INCLUDE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "ogv"]

export const DOWNLOAD_RENAME_RULES = arrays.distinctBy(MATCH_RULES.map(r => ({ruleName: r.ruleName, rename: r.rename})), objects.deepEquals)

export const SOURCE_DATA_COLLECT_RULES = SOURCE_DATA_RULES.map(r => ({ruleName: r.ruleName, sourceSite: r.sourceSite, additionalInfo: r.additionalInfo}))

interface MatchRule {
    ruleName: string
    referrer?: RegExp
    url?: RegExp
    filename?: RegExp
    rename: string
    processor?: string
}

interface SourceDataRule {
    ruleName: string
    sourceSite: string
    sourceId: string
    pattern: string
    additionalInfo: {key: string, additionalField: string}[]
}
