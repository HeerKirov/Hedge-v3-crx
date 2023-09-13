
export interface BookmarkModel {
    bookmarkId: number
    name: string
    otherNames: string[]
    description: string
    keywords: string[]
    groups: [string, string][]
    score: number | undefined
    lastCollectTime: Date | undefined
    createTime: Date
    updateTime: Date
    pages: Page[]
}

export interface Page {
    pageId: number
    url: string
    host: string
    title: string
    description: string | undefined
    keywords: string[] | undefined
    groups: [string, string][] | undefined
    lastCollect: string | undefined
    lastCollectTime: Date | undefined
    createTime: Date
    updateTime: Date
}

export interface PageReferenceModel {
    url: string
    bookmarkId: number
    pageId: number
}

export interface GroupModel {
    groupKeyPath: string
    groupName: string
    availableFor: "bookmark" | "page" | "both"
    availableCondition: [string, string][] | undefined
    multi: boolean
    items: {itemKeyPath: string, itemName: string}[]
}

export interface StoredQueryModel {
    queryId: number
    ordinal: number
    name: string
    search: string | undefined
    groups: [string, string][] | undefined
    order: "createTime" | "updateTime" | "lastCollectTime" | "score" | undefined
    orderDirection: "asc" | "desc" | undefined
}
