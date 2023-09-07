import { BookmarkModel, GroupModel, PageReferenceModel } from "./model"

export const databases = {
    async load(): Promise<void> {
        try {
            idb = await createDatabase()
        }catch(e) {
            console.error("[database] initialize failed. ", e)
            idb = undefined
        }

        /*
        const t = idb!.transaction(["bookmark", "pageReference", "group"], "readwrite")
        await t.clearBookmark()
        await t.clearPageReference()
        await t.clearGroup()
        await t.putGroup({
            groupKeyPath: "COLLECT_STATUS",
            groupName: "收集状态",
            availableFor: "both",
            availableCondition: undefined,
            multi: false,
            items: [{itemKeyPath: "TODO", itemName: "TODO"}, {itemKeyPath: "COLLECTING", itemName: "收集中"}, {itemKeyPath: "COLLECTED", itemName: "已收集"}]
        })
        const b = await t.addBookmark({
            name: "书签",
            otherNames: ["bm", "secondary text"],
            groups: [["COLLECT_STATUS", "COLLECTED"]],
            description: "描述",
            score: 4,
            keywords: ["K1", "关键字"],
            lastCollectTime: undefined,
            createTime: new Date(),
            updateTime: new Date(),
            pages: []
        })
        const p = await t.addPageReference({bookmarkId: b.bookmarkId, url: "https://e-hentai.org/g/0/0"})
        b.pages.push({
            pageId: p.pageId,
            url: "https://e-hentai.org/g/0/0",
            host: "e-hentai.org",
            title: "E-Hentai",
            groups: [["COLLECT_STATUS", "TODO"]],
            description: "描述",
            keywords: ["K1", "关键字"],
            collectRange: {upToId: "999999", upToTime: new Date()},
            lastCollectTime: undefined,
            createTime: new Date(),
            updateTime: new Date(),
        })
        await t.putBookmark(b)
        */
    },
    async transaction(object: ObjectStoreNames | ObjectStoreNames[], mode: "readwrite" | "readonly"): Promise<Transaction> {
        if(idb === undefined) {
            try {
                idb = await createDatabase()
            }catch(e) {
                console.error("[database] initialize failed. ", e)
                idb = undefined
            }
        }
        return idb!.transaction(object, mode)
    }
}

let idb: Database | undefined

const migrations: {[ver: number]: (idb: IDBDatabase) => void} = {
    1(idb) {
        idb.createObjectStore("query", { keyPath: "queryId", autoIncrement: true })
        idb.createObjectStore("group", { keyPath: "groupKeyPath" })
        idb.createObjectStore("bookmark", { keyPath: "bookmarkId", autoIncrement: true })
        const pegeReferenceStore = idb.createObjectStore("pageReference", { keyPath: "pageId", autoIncrement: true })
        pegeReferenceStore.createIndex("url", "url", { unique: false })
    }
}

const migrateVersion = Math.max(...Object.keys(migrations).map(i => parseInt(i)))

type ObjectStoreNames = "group" | "bookmark" | "pageReference" | "query"

interface Database {
    transaction(object: ObjectStoreNames | ObjectStoreNames[], mode: "readwrite" | "readonly"): Transaction
}

interface Transaction {
    putGroup(model: GroupModel): Promise<GroupModel>
    getGroup(groupKeyPath: string): Promise<GroupModel | undefined>
    deleteGroup(groupKeyPath: string): Promise<boolean>
    cursorGroup(): Cursor<GroupModel>
    countGroup(): Promise<number>
    clearGroup(): Promise<void>

    addBookmark(model: Omit<BookmarkModel, "bookmarkId">): Promise<BookmarkModel>
    putBookmark(model: BookmarkModel): Promise<BookmarkModel>
    getBookmark(bookmarkId: number): Promise<BookmarkModel | undefined>
    deleteBookmark(bookmarkId: number): Promise<boolean>
    cursorBookmark(): Cursor<BookmarkModel>
    countBookmark(): Promise<number>
    clearBookmark(): Promise<void>

    addPageReference(model: Omit<PageReferenceModel, "pageId">): Promise<PageReferenceModel>
    putPageReference(model: PageReferenceModel): Promise<PageReferenceModel>
    getPageReference(pageId: number): Promise<PageReferenceModel | undefined>
    deletePageReference(pageId: number): Promise<boolean>
    getPageReferenceByUrl(url: string): Promise<PageReferenceModel | undefined>
    clearPageReference(): Promise<void>
}

interface Cursor<T> {
    limitAndOffset(limit: number | undefined, offset: number | undefined): Cursor<T>
    filter(condition: (record: T) => boolean): Cursor<T>
    direction(direction: "next" | "prev" | undefined): Cursor<T>
    order(compareFn: ((a: T, b: T) => number) | undefined): Cursor<T>
    toList(): Promise<T[]>
    count(): Promise<number>
    forEach(func: (record: T) => void): Promise<void>
}

async function createDatabase(): Promise<Database> {
    return new Promise((resolve, reject) => {
        const dbOpenReq = indexedDB.open("Hedge-Bookmark", migrateVersion)
        dbOpenReq.onupgradeneeded = e => {
            const idb = dbOpenReq.result
            for(let i = e.oldVersion + 1; i <= (e.newVersion ?? migrateVersion); ++i) {
                migrations[i]?.(idb)
            }
        }
        dbOpenReq.onerror = () => {
            console.error("Database initialize failed. ", dbOpenReq.error?.message)
            reject(dbOpenReq.error?.message)
        }
        dbOpenReq.onsuccess = () => {
            const idb = dbOpenReq.result

            resolve({
                transaction(object, mode) {
                    return createTransaction(idb, object, mode)
                }
            })
        }
    })
}

async function dropDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        const dbOpenReq = indexedDB.deleteDatabase("Hedge-Bookmark")
        dbOpenReq.onerror = () => {
            console.error("Database drop failed. ", dbOpenReq.error?.message)
            reject(dbOpenReq.error?.message)
        }
        dbOpenReq.onsuccess = () => { resolve() }
    })
}

function createTransaction(idb: IDBDatabase, object: ObjectStoreNames | ObjectStoreNames[], mode: "readwrite" | "readonly"): Transaction {
    const trans = idb.transaction(object, mode)

    function promiseRequest<T>(getter: () => IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const req = getter()
            req.onsuccess = () => {
                resolve(req.result)
            }
            req.onerror = () => {
                reject(req.error)
            }
        })
    }

    return {
        async putGroup(model) {
            await promiseRequest(() => trans.objectStore("group").put(model))
            return model
        },
        async getGroup(groupKeyPath) {
            return await promiseRequest(() => trans.objectStore("group").get(groupKeyPath))
        },
        async deleteGroup(groupKeyPath) {
            return await promiseRequest(() => trans.objectStore("group").delete(groupKeyPath)) === undefined
        },
        cursorGroup() {
            return createCursor(direction => trans.objectStore("group").openCursor(null, direction))
        },
        async countGroup() {
            return await promiseRequest(() => trans.objectStore("group").count())
        },
        async clearGroup() {
            await promiseRequest(() => trans.objectStore("group").clear())
        },
        async addBookmark(model) {
            const key = await promiseRequest(() => trans.objectStore("bookmark").add(model))
            return {...model, bookmarkId: key as number}
        },
        async putBookmark(model) {
            await promiseRequest(() => trans.objectStore("bookmark").put(model))
            return model
        },
        async getBookmark(bookmarkId) {
            return await promiseRequest(() => trans.objectStore("bookmark").get(bookmarkId))
        },
        async deleteBookmark(bookmarkId) {
            return await promiseRequest(() => trans.objectStore("bookmark").delete(bookmarkId)) === undefined
        },
        cursorBookmark() {
            return createCursor(direction => trans.objectStore("bookmark").openCursor(null, direction))
        },
        async countBookmark() {
            return await promiseRequest(() => trans.objectStore("bookmark").count())
        },
        async clearBookmark() {
            await promiseRequest(() => trans.objectStore("bookmark").clear())
        },
        async addPageReference(model) {
            const key = await promiseRequest(() => trans.objectStore("pageReference").put(model))
            return {...model, pageId: key as number}
        },
        async putPageReference(model) {
            await promiseRequest(() => trans.objectStore("pageReference").put(model))
            return model
        },
        async getPageReference(pageId) {
            return await promiseRequest(() => trans.objectStore("pageReference").get(pageId))
        },
        async deletePageReference(pageId) {
            return await promiseRequest(() => trans.objectStore("pageReference").delete(pageId)) === undefined
        },
        async getPageReferenceByUrl(url) {
            return await promiseRequest(() => trans.objectStore("pageReference").index("url").get(url))
        },
        async clearPageReference() {
            await promiseRequest(() => trans.objectStore("pageReference").clear())
        },
    }
}

function createCursor<T>(getter: (direction: "next" | "prev") => IDBRequest<IDBCursorWithValue | null>): Cursor<T> {
    let limit: number | undefined
    let offset: number | undefined
    let direction: "next" | "prev"
    let orderFn: ((a: T, b: T) => number) | undefined
    const filters: ((t: T) => boolean)[] = []

    const that: Cursor<T> = {
        limitAndOffset(l, o) {
            if(l === undefined || l > 0) limit = l
            if(o === undefined || o > 0) offset = o
            return that
        },
        filter(condition) {
            filters.push(condition)
            return that
        },
        direction(d) {
            direction = d ?? "next"
            return that
        },
        order(compareFn) {
            orderFn = compareFn
            return that
        },
        toList() {
            return new Promise((resolve, reject) => {
                const req = getter(direction)
                const ret: T[] = []
                let index = 0
                req.onsuccess = () => {
                    const cursor = req.result
                    if(cursor) {
                        if((offset === undefined || index >= offset) && filters.every(filter => filter(cursor.value))) {
                            ret.push(cursor.value)
                        }
                        cursor.continue()
                        index += 1
                        if(limit !== undefined && index >= (limit + (offset ?? 0))) {
                            if(orderFn) ret.sort(orderFn)
                            resolve(ret)
                        }
                    }else{
                        if(orderFn) ret.sort(orderFn)
                        resolve(ret)
                    }
                }
                req.onerror = () => {
                    reject(req.error?.message)
                }
            })
        },
        count() {
            return new Promise((resolve, reject) => {
                const req = getter(direction)
                let count = 0
                let index = 0
                req.onsuccess = () => {
                    const cursor = req.result
                    if(cursor) {
                        if((offset === undefined || index >= offset) && filters.every(filter => filter(cursor.value))) {
                            count += 1
                        }
                        cursor.continue()
                        index += 1
                        if(limit !== undefined && index >= (limit + (offset ?? 0))) {
                            resolve(count)
                        }
                    }else{
                        resolve(count)
                    }
                }
                req.onerror = () => {
                    reject(req.error?.message)
                }
            })
        },
        forEach(func) {
            return new Promise((resolve, reject) => {
                const req = getter(direction)
                let index = 0
                req.onsuccess = () => {
                    const cursor = req.result
                    if(cursor) {
                        if((offset === undefined || index >= offset) && filters.every(filter => filter(cursor.value))) {
                            func(cursor.value)
                        }
                        cursor.continue()
                        index += 1
                        if(limit !== undefined && index >= (limit + (offset ?? 0))) {
                            resolve()
                        }
                    }else{
                        resolve()
                    }
                }
                req.onerror = () => {
                    reject(req.error?.message)
                }
            })
        },
    }

    return that
}