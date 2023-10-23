
export const EHENTAI_CONSTANTS = {
    HOSTS: ["e-hentai.org", "exhentai.org"],
    PATTERNS: {
        ANY_IMAGE_URL: ["https://e-hentai.org/s/*/*", "https://exhentai.org/s/*/*"],
        GALLERY_URL: (sourceId: number | string) => [`https://e-hentai.org/g/${sourceId}/*`, `https://exhentai.org/g/${sourceId}/*`]
    },
    REGEXES: {
        GALLERY_PATHNAME: /^\/g\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)$/,
        IMAGE_PATHNAME: /^\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)$/,
        TAG_PATHNAME: /^\/tag\/(?<TYPE>.*):(?<NAME>.+)$/,
        HOMEPAGE_URL: /https:\/\/e[-x]hentai\.org\/$/,
        FULLIMG_URL: /https:\/\/e[-x]hentai\.org\/fullimg\.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        IMAGE_URL: /https:\/\/e[-x]hentai\.org\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)/
    }
}

export const PIXIV_CONSTANTS = {
    HOSTS: ["www.pixiv.net"],
    PATTERNS: {
        ARTWORK_URL: (sourceId: number | string) => `https://www.pixiv.net/artworks/${sourceId}`
    },
    REGEXES: {
        ARTWORK_PATHNAME: /^\/artworks\/(?<PID>\d+)$/,
        USER_PATHNAME: /^\/users\/(?<UID>\d+)/,
        USER_ABOUT_PATHNAME: /^\/users\/(?<UID>\d+)(\/(artworks|illustrations|manga))?$/,
        HOMEPAGE_URL: /https:\/\/www\.pixiv\.net\/$/
    }
}

export const SANKAKUCOMPLEX_CONSTANTS = {
    HOSTS: ["chan.sankakucomplex.com"],
    PATTERNS: {
        ANY_URL: "https://chan.sankakucomplex.com/*",
        POST_URL: (md5: string) => [
            `https://chan.sankakucomplex.com/*/posts/${md5}`,
            `https://chan.sankakucomplex.com/*/posts/show/${md5}`,
            `https://chan.sankakucomplex.com/*/post/show/${md5}`,
            `https://chan.sankakucomplex.com/posts/${md5}`,
            `https://chan.sankakucomplex.com/posts/show/${md5}`,
            `https://chan.sankakucomplex.com/post/show/${md5}`
        ],
        BOOK_URL: (bookId: number | string) => `https://chan.sankakucomplex.com/pool/show/${bookId}`
    },
    REGEXES: {
        POST_PATHNAME: /^\/(\S+\/)?(post\/show|posts|posts\/show)\/(?<MD5>\S+)$/,
        SEARCH_PATHNAME: /^(\/|\/post|\/\S+\/post|\/posts|\/\S+\/posts)$/,
        POST_URL: /https:\/\/chan\.sankakucomplex\.com\/(\S+\/)?(post\/show|posts|posts\/show)\/(?<MD5>\S+)/
    }
}

export const BETA_SANKAKUCOMPLEX_CONSTANTS = {
    HOSTS: ["beta.sankakucomplex.com"],
    REGEXES: {
        SEARCH_PATHNAME: /^(\/|\/books|\/posts)$/,
    }
}

export const IDOL_SANKAKUCOMPLEX_CONSTANTS = {
    HOSTS: ["idol.sankakucomplex.com"],
    REGEXES: {
        POST_URL: /https:\/\/idol.sankakucomplex.com\/post\/show\/(?<PID>\d+)/
    }
}

export const GELBOORU_CONSTANTS = {
    HOSTS: ["gelbooru.com"],
    REGEXES: {
        POST_URL: /https:\/\/gelbooru.com\/index.php\?.*id=(?<PID>\d+)/
    }
}

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
        rename: "pixiv_$<PID>_p$<PAGE>"
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
        host: SANKAKUCOMPLEX_CONSTANTS.HOSTS,
        sourcePages: [
            SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME
        ]
    },
    "ehentai": {
        sourceSite: "ehentai",
        additionalInfo: {"token": "token"},
        host: EHENTAI_CONSTANTS.HOSTS,
        sourcePages: [
            EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME,
            EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME
        ]
    },
    "pixiv": {
        sourceSite: "pixiv",
        additionalInfo: {},
        host: PIXIV_CONSTANTS.HOSTS,
        sourcePages: [
            PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME
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
