import { sendMessageToTab } from "@/services/messages"
import { server } from "@/functions/server"
import { Setting } from "@/functions/setting"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { sessions } from "@/functions/storage"

type CollectSourceDataOptions = ({sourceId: number, args?: undefined} | {args: Record<string, string>, sourceId?: undefined}) & {
    siteName: string
    setting: Setting
    skipCheckingCache?: boolean
}

/**
 * 收集指定来源的数据。完成数据收集后，直接上传到后端。
 * sourceId/args二者需要给出其一。给出args时，根据默认参数从args中提取sourceId。
 * skipCheckingCache指定为true时，跳过所有缓存检查，必定收集数据。
 */
export async function collectSourceData({ siteName, setting, ...options }: CollectSourceDataOptions): Promise<boolean> {
    const rule = SOURCE_DATA_COLLECT_SITES[siteName]
    if(rule === undefined) {
        console.log(`[collectSourceData] '${siteName}' no this rule, skip.`)
        //没有对应名称的规则，因此跳过
        return false
    }
    const overrideRule = setting.sourceData.overrideRules[siteName]
    if(overrideRule && !overrideRule.enable) {
        console.log(`[collectSourceData] '${siteName}' is disabled, skip.`)
        //该规则已被禁用，因此跳过
        return false
    }
    const generator = SOURCE_DATA_RULES[siteName]

    const sourceSite = (overrideRule ?? rule).sourceSite
    let sourceId: number
    if(options.sourceId !== undefined) {
        sourceId = options.sourceId
    }else{
        sourceId = parseInt(options.args[generator.sourceId])
        if(isNaN(sourceId)) {
            console.error(`[collectSourceData] ${sourceSite}-${options.args[generator.sourceId]} source id analyse failed.`)
            return false
        }
    }

    if(!options.skipCheckingCache) {
        if(await sessions.cache.sourceDataCollected.get({site: sourceSite, sourceId})) {
            console.log(`[collectSourceData] ${sourceSite}-${sourceId} cached, skip.`)
            //该条数据近期被保存过，因此跳过
            return false
        }
    
        const retrieve = await server.sourceData.get({sourceSite: sourceSite, sourceId})
        if(retrieve.ok) {
            if(retrieve.data.status === "IGNORED") {
                //已忽略的数据，不收集
                sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
                console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is IGNORED, skip collecting.`)
                return false
            }else if(retrieve.data.status === "EDITED") {
                const lastUpdateTime = Date.parse(retrieve.data.updateTime)
                if(Date.now() - lastUpdateTime < 1000 * 60 * 60 * 24 * 7) {
                    //EDITED状态，依据上次更新时间，在7天以内的不收集
                    sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)
                    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} is edited in 7 days, skip collecting.`)
                    return false
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
            return false
        }
    }

    const patternResult = generator.pattern(sourceId)
    const pageURL = typeof patternResult === "string" ? patternResult : await patternResult
    if(pageURL === null) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 无法正确生成提取页面的URL。`
        })
        console.warn(`[collectSourceData] ${sourceSite}-${sourceId} Cannot generate pattern URL.`)
        return false
    }
    const tabs = await chrome.tabs.query({currentWindow: true, url: pageURL})
    if(tabs.length <= 0 || tabs[0].id === undefined) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "来源数据收集异常",
            message: `${sourceSite}-${sourceId}: 未找到用于提取数据的页面。`
        })
        console.warn(`[collectSourceData] Page '${pageURL}' not found.`)
        return false
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
        return false
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
        return false
    }

    sessions.cache.sourceDataCollected.set({site: sourceSite, sourceId}, true)

    console.log(`[collectSourceData] Source data ${sourceSite}-${sourceId} collected.`)
    return true
}

const SOURCE_DATA_RULES: Record<string, SourceDataRule> = {
    "sankakucomplex": {
        sourceId: "PID",
        pattern: async sourceId => {
            const md5 = await sessions.reflect.sankakuPostMD5.get({pid: sourceId.toString()})
            return md5 ? `https://chan.sankakucomplex.com/post/show/${md5.md5}` : null
        }
    },
    "ehentai": {
        sourceId: "GID",
        pattern: sourceId => `https://e-hentai.org/g/*/${sourceId}`
    },
    "pixiv": {
        sourceId: "PID",
        pattern: sourceId => `https://www.pixiv.net/artworks/${sourceId}`
    }
}

interface SourceDataRule {
    sourceId: string
    pattern(sourceId: number): string | null | Promise<string | null>
}
