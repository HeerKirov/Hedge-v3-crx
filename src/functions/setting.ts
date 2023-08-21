import { version } from "@/../package.json"
import { Migrate, migrate } from "@/utils/migrations"
import { useEffect, useRef, useState } from "react"

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
 * 与优化工具相关的设置项。所有功能默认开启。
 */
interface Tool {
    /**
     * sankakucomplex的扩展工具。
     */
    sankakucomplex: {
        /**
         * 屏蔽部分快捷键。
         */
        enableShortcutForbidden: boolean
        /**
         * 增强翻页。
         */
        enablePaginationEnhancement: boolean
        /**
         * 增强标签列表。
         */
        enableTagListEnhancement: boolean
        /**
         * 增强pool列表。
         */
        enableBookEnhancement: boolean
        /**
         * 替换图像链接。
         */
        enableImageLinkReplacement: boolean
        /**
         * 在URL添加PID标识。
         */
        enableAddPostId: boolean
    }
    /**
     * ehentai的扩展工具。
     */
    ehentai: {
        /**
         * 启用评论区智能屏蔽机制。
         */
        enableCommentForbidden: boolean
        /**
         * 启用评论区关键字屏蔽。
         */
        enableCommentBanned: boolean
        /**
         * 评论区屏蔽关键字列表。
         */
        commentBannedList: string[]
    }
}

/**
 * 与文件下载重命名相关的设置项。
 */
interface Download {
    /**
     * 覆盖固有规则。默认情况下，启用全部固有规则，在这里可以覆盖一部分设置。
     */
    overrideRules: {
        [ruleName: string]: {
            /**
             * 是否启用此规则。
             */
            enable: boolean
            /**
             * 覆盖：新的rename模板。
             */
            rename: string | null
        }
    }
    /**
     * 追加的自定义规则。
     */
    customRules: {
        /**
         * 重命名模板。
         */
        rename: string
        /**
         * 匹配referrer并获取字段。
         */
        referrer: string | null
        /**
         * 匹配url并获取字段。
         */
        url: string | null
        /**
         * 匹配filename并获取字段。
         */
        filename: string | null
    }[]
    /**
     * 覆盖扩展名支持。默认情况下，使用内置的扩展名列表，在这里可以追加新扩展名。
     */
    customExtensions: string[]
}

/**
 * 与来源数据收集相关的设置项。
 */
interface SourceData {
    /**
     * 覆盖固有规则。默认情况下，启用全部固有规则，在这里可以覆盖一部分设置。
     */
    overrideRules: {
        [ruleName: string]: {
            /**
             * 是否启用此规则。
             */
            enable: boolean
            /**
             * 映射到Hedge server中的site name。
             */
            sourceSite: string
            /**
             * 映射到Hedge server中的附加信息定义。key为固有信息键名，additionalField为site中的附加信息字段名。
             */
            additionalInfo: {key: string, additionalField: string}[]
        } | undefined
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
                enableShortcutForbidden: true,
                enableTagListEnhancement: true,
                enablePaginationEnhancement: true,
                enableBookEnhancement: true,
                enableImageLinkReplacement: true,
                enableAddPostId: true
            },
            ehentai: {
                enableCommentForbidden: true,
                enableCommentBanned: true,
                commentBannedList: []
            }
        },
        download: {
            overrideRules: {},
            customRules: [],
            customExtensions: []
        },
        sourceData: {
            overrideRules: {}
        }
    }
}

export const settings = {
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
    async reset(): Promise<void> {
        await chrome.storage.local.set({ "setting": defaultSetting() })
    },
    async get(): Promise<Setting> {
        const r = (await chrome.storage.local.get(["setting"]))["setting"] as Setting | undefined
        return r ?? defaultSetting()
    },
    async set(setting: Setting) {
        await chrome.storage.local.set({ "setting": setting })
    }
}

export function useSetting() {
    const [setting, setSetting] = useState<Setting | null>(null)

    const loading = useRef(false)

    const saveSetting = async (newSetting: Setting) => {
        setSetting(newSetting)
        await settings.set(newSetting)
    }

    useEffect(() => {
        if(!loading.current) {
            loading.current = true
            settings.get().then(res => {
                setSetting(res)
                loading.current = false
            })
        }
    }, [])
    
    return { setting, saveSetting }
}

const migrations: {[version: string]: Migrate<MigrateContext>} = {
    async "0.1.0"() {/*v0.1.0的占位符。只为将版本号升级到v0.1.0*/}
}

export interface MigrateContext {
    setting: Setting
}
