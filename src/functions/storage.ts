
/**
 * session会话存储。在这里的通常是各类临时缓存。
 */
export const session = {
    /**
     * 反射信息。根据一个固定ID，反射至该固定ID的某个固定值。
     * 这类反射信息通常在document loaded时在页面被保存，并在download suggest等处被使用。
     */
    reflect: {
        /**
         * E-Hentai: gallery id + page映射到image hash。
         */
        ehentaiGalleryImageHash: createPathEndpoint<{gid: string, page: string}, {imageHash: string}>("session", p => `ehentai/gallery-page/hash/${p.gid}-${p.page}`),
        /**
         * Sankaku: post MD5映射到post id。
         */
        sankakuPostId: createPathEndpoint<{md5: string}, {pid: string}>("session", p => `sankaku/post/id-mapping/${p.md5}`)
    }
}

function createEndpoint<T>(type: "local" | "session", key: string) {
    return async function(newValue?: T): Promise<T | undefined> {
        const f = type === "local" ? chrome.storage.local : chrome.storage.session
        if(newValue !== undefined) {
            await f.set({ [key]: newValue })
            return newValue
        }else{
            const res = await f.get([key])
            return res[key]
        }
    }
}

function createPathEndpoint<P, T>(type: "local" | "session", keyOf: (path: P) => string) {
    return async function(path: P, newValue?: T): Promise<T | undefined> {
        const key = keyOf(path)
        const f = type === "local" ? chrome.storage.local : chrome.storage.session
        if(newValue !== undefined) {
            await f.set({ [key]: newValue })
            return newValue
        }else{
            const res = await f.get([key])
            return res[key]
        }
    }
}