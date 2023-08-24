
/**
 * 在Download Rename功能中受支持的网站。此处只包含了网站的总定义(即默认设置)，一些细节都在download模块。
 */
export const DOWNLOAD_RENAME_SITES: {[siteName: string]: DownloadRenameRule} = {
    "sankakucomplex": {
        args: ["PID", "MD5"],
        rename: "sankakucomplex_$<PID>",
    },
    "ehentai": {
        args: ["GID", "PAGE", "PHASH"],
        rename: "ehentai_$<GID>_$<PAGE>_$<PHASH>"
    },
    "pixiv": {
        args: ["PID", "PAGE"],
        rename: "pixiv_$<PID>_$<PAGE>"
    },
    "gelbooru": {
        args: ["PID"],
        rename: "gelbooru_$<PID>"
    },
    "idolcomplex": {
        args: ["PID"],
        rename: "idolcomplex_$<PID>"
    }
}

/**
 * 在Collect SourceData功能中受支持的网站。此处只包含了网站的总定义(即默认设置)，一些细节都在source-data模块。
 */
export const SOURCE_DATA_COLLECT_SITES: {[siteName: string]: SourceDataCollectRule} = {
    "sankakucomplex": {
        sourceSite: "sankakucomplex",
        additionalInfo: {"md5": "md5"},
        host: "chan.sankakucomplex.com",
        sourcePages: [
            /^\/post\/show\/(?<MD5>\S+)$/
        ]
    },
    "ehentai": {
        sourceSite: "ehentai",
        additionalInfo: {"token": "token"},
        host: ["e-hentai.org"],
        sourcePages: [
            /^\/g\/(?<GID>\d+)\/[a-zA-Z0-9]+$/,
            /^\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)$/
        ]
    },
    "pixiv": {
        sourceSite: "pixiv",
        additionalInfo: {},
        host: "pixiv.net",
        sourcePages: [
            /^\/artworks\/(?<PID>\d+)$/
        ]
    }
}

/**
 * 在Download Rename功能中受支持的扩展名。
 */
export const DOWNLOAD_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "ogv"]

interface DownloadRenameRule {
    args: string[]
    rename: string
}

interface SourceDataCollectRule {
    sourceSite: string
    additionalInfo: {[key: string]: string}
    host: string | string[]
    sourcePages: RegExp[]
}
