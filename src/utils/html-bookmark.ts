
/**
 * 解析一份标准书签备份文件，并将其转换为可读结构。
 */
export function analyseHTMLBookmarkFile(html: string): HTMLBookmark[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    for(const child of doc.body.childNodes) {
        if(child instanceof HTMLDListElement) {
            return analyseDList(child)
        }
    }
    return []
}

function analyseDList(dl: HTMLDListElement): HTMLBookmark[] {
    const ret: HTMLBookmark[] = []
    for(const dt of dl.childNodes) {
        if(dt instanceof HTMLElement && dt.nodeName === "DT") {
            let name: string | undefined
            let children: HTMLBookmark[] | undefined
            for(const child of dt.childNodes) {
                if(child instanceof HTMLAnchorElement) {
                    const url = child.href
                    const title = child.textContent ?? ""
                    const addDate = parseDateString(child.getAttribute("add_date"))
                    ret.push({type: "bookmark", title, url, addDate})
                    break
                }else if(child instanceof HTMLHeadingElement) {
                    name = child.textContent ?? ""
                    if(children !== undefined) break
                }else if(child instanceof HTMLDListElement) {
                    children = analyseDList(child)
                    if(name !== undefined) break
                }
            }
            if(name !== undefined || children !== undefined) {
                ret.push({type: "node", name: name ?? "", children: children ?? []})
            }
        }
    }
    return ret
}

function parseDateString(date: string | null): number | null {
    const d = date || null
    if(d === null) return null
    const pd = parseInt(d)
    if(isNaN(pd)) return null
    return pd * 1000
}

export type HTMLBookmark = HTMLBookmarkNode | HTMLBookmarkItem

export interface HTMLBookmarkNode {
    type: "node"
    name: string
    children: HTMLBookmark[]
}

export interface HTMLBookmarkItem {
    type: "bookmark"
    title: string
    url: string
    addDate: number | null
}
