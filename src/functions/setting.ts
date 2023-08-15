import { version } from "../../package.json"
import { Migrate, migrate } from "../utils/migrations"

/**
 * 所有的设置项。
 */
export interface Setting {
    version: string
    server: Server
    tool: Tool
    download: Download
    sourceData: SourceData
}

/**
 * 与后端连接相关的设置项。
 */
interface Server {
    /**
     * 要连接到的后端端口。
     */
    port: number
    /**
     * 连接到后端时使用的token。需要在后端设置项里配置一个常驻token。
     */
    token: string
}

/**
 * 与优化工具相关的设置项。
 */
interface Tool {
    sankakucomplex: {
        enableShortcutForbidden: boolean
        enablePaginationEnhancement: boolean
        enableTagListEnhancement: boolean
        enableBookEnhancement: boolean
        enableImageLinkReplacement: boolean
        enableAddPostId: boolean
    }

}

/**
 * 与文件下载重命名相关的设置项。
 */
interface Download {
    sankakucomplex: {
        enable: boolean
        rename: string
    }
    idolcomplex: {
        enable: boolean
        rename: string
    }
    pixiv: {
        enable: boolean
        rename: string
    }
    ehentai: {
        enable: boolean
        rename: string
    }
    gelbooru: {
        enable: boolean
        rename: string
    }
}

/**
 * 与来源数据收集相关的设置项。
 */
interface SourceData {
    sankakucomplex: {
        enable: boolean
        sourceSite: string
        additionalInfo: {key: string, additionalField: string}[]
    }
    ehentai: {
        enable: boolean
        sourceSite: string
        additionalInfo: {key: string, additionalField: string}[]
    }
    pixiv: {
        enable: boolean
        sourceSite: string
        additionalInfo: {key: string, additionalField: string}[]
    }
}

function defaultSetting(): Setting {
    return {
        version,
        server: {
            port: 9000,
            token: "hedge-v3-crx-token"
        },
        tool: {
            sankakucomplex: {
                enableAddPostId: true,
                enableBookEnhancement: true,
                enableImageLinkReplacement: true,
                enablePaginationEnhancement: true,
                enableShortcutForbidden: true,
                enableTagListEnhancement: true
            }
        },
        download: {
            sankakucomplex: { enable: true, rename: "sankakucomplex_$<PID>" },
            idolcomplex: { enable: true, rename: "idolcomplex_$<PID>" },
            pixiv: { enable: true, rename: "pixiv_$<PID>_$<PAGE>" },
            ehentai: { enable: true, rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>" },
            gelbooru: { enable: true, rename: "gelbooru_$<PID>" },
        },
        sourceData: {
            sankakucomplex: { enable: true, sourceSite: "sankakucomplex", additionalInfo: [] },
            ehentai: { enable: true, sourceSite: "ehentai", additionalInfo: [] },
            pixiv: { enable: true, sourceSite: "pixiv", additionalInfo: [] },
        }
    }
}

export const setting = {
    async load(reload: boolean = false): Promise<void> {
        const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
        if(r !== undefined && !reload) {
            const { setting, changed } = await migrate({setting: r}, migrations, {
                set(context, v) {
                    context.setting.version = v
                },
                get(context) {
                    return context.setting.version
                }
            })
            if(changed) {
                await chrome.storage.local.set({ "setting": setting })
            }
        }else{
            await chrome.storage.local.set({ "setting": defaultSetting() })
        }
    },
    async get(): Promise<Setting> {
        const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
        if(r !== undefined) {
            return r
        }else{
            return defaultSetting()
        }
    },
    async set(setting: Setting) {
        await chrome.storage.local.set({ "setting": setting })
    }
}

const migrations: {[version: string]: Migrate<MigrateContext>} = {
    async "0.1.0"() {/*v0.1.0的占位符。只为将版本号升级到v0.1.0*/}
}

export interface MigrateContext {
    setting: Setting
}
