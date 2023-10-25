import { useCallback, useEffect, useMemo, useState } from "react"
import { GroupModel, StoredQueryModel } from "@/functions/database"
import { BookmarkForm, PageForm, StoredQueryForm, QueryBookmarkFilter, bookmarks, groups, storedQueries } from "@/services/bookmarks"
import { useAsyncLoading, useWatch } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"

interface BookmarkListOptions {
    filter?: QueryBookmarkFilter | null
}

interface BookmarkSelectionOptions {
    afterUpdate?(): void
}

interface QueryAndFilterOptions {
    allStoredQueries?: StoredQueryModel[] | null
    addStoredQuery?(form: StoredQueryForm): Promise<number>
    updateStoredQuery?(index: number, form: StoredQueryForm): void
}

export function useBookmarkList(options?: BookmarkListOptions) {
    const [bookmarkList, setBookmarkList] = useAsyncLoading(useCallback(async () => {
        if(options?.filter !== undefined) {
            console.time("query")
            try {
                return options.filter !== null ? await bookmarks.queryBookmarks(options.filter) : []
            }finally{
                console.timeEnd("query")
            }
        }else{
            return bookmarks.queryBookmarks({})
        }
    }, [options?.filter]))

    const [errorMessage, setErrorMessage] = useState<{error: "URL_ALREADY_EXISTS"} | null>(null)

    //重新获取数据的方法是一个异步外部方法，因此应该使用Effect，作为副作用处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setBookmarkList(), [options?.filter])

    const clearErrorMessage = useCallback(() => setErrorMessage(null), [])

    const addBookmark = useCallback(async (form: BookmarkForm): Promise<boolean> => {
        const res = await bookmarks.addBookmark(form)
        setBookmarkList(bookmarkList => [...(bookmarkList ?? []), res])
        return true
    }, [setBookmarkList])

    const updateBookmark = useCallback(async (bookmarkId: number, form: BookmarkForm) => {
        const res = await bookmarks.updateBookmark(bookmarkId, form)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList?.findIndex(i => i.bookmarkId === bookmarkId) ?? -1
                    return [...bookmarkList.slice(0, index), res.value, ...bookmarkList.slice(index + 1)]
                }
                return []
            })
        }
    }, [setBookmarkList])

    const deleteBookmark = useCallback(async (bookmarkId: number) => {
        const res = await bookmarks.deleteBookmark(bookmarkId)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList?.findIndex(i => i.bookmarkId === bookmarkId) ?? -1
                    return [...bookmarkList.slice(0, index), ...bookmarkList.slice(index + 1)]
                }
                return []
            })
        }
    }, [setBookmarkList])

    const addPage = useCallback(async (bookmarkId: number, pageIndex: number | null, page: PageForm): Promise<boolean> => {
        const res = await bookmarks.addPage(bookmarkId, pageIndex, page)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList.findIndex(i => i.bookmarkId === bookmarkId)
                    return [
                        ...bookmarkList.slice(0, index),
                        res.value.bookmark,
                        ...bookmarkList.slice(index + 1)
                    ]
                }
                return []
            })
            setErrorMessage(null)
            return true
        }else if(res.err === "URL_ALREADY_EXISTS") {
            setErrorMessage({error: res.err})
        }
        return false
    }, [setBookmarkList])

    const updatePage = useCallback(async (bookmarkId: number, pageId: number, page: PageForm) => {
        const res = await bookmarks.updatePage(bookmarkId, pageId, page)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList.findIndex(i => i.bookmarkId === bookmarkId)
                    return [
                        ...bookmarkList.slice(0, index),
                        res.value.bookmark,
                        ...bookmarkList.slice(index + 1)
                    ]
                }
                return []
            })
            setErrorMessage(null)
            return true
        }else if(res.err === "URL_ALREADY_EXISTS") {
            setErrorMessage({error: res.err})
        }
        return false
    }, [setBookmarkList])

    const movePage = useCallback(async (bookmarkId: number, pageId: number, moveToBookmarkId: number, moveToPageIndex: number | null) => {
        const res = await bookmarks.movePage(bookmarkId, pageId, moveToBookmarkId, moveToPageIndex)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList.findIndex(i => i.bookmarkId === bookmarkId)
                    const moveToIndex = bookmarkList.findIndex(i => i.bookmarkId === moveToBookmarkId)
                    if(moveToIndex > index) {
                        return [
                            ...bookmarkList.slice(0, index),
                            res.value.origin,
                            ...bookmarkList.slice(index + 1, moveToIndex),
                            res.value.target,
                            ...bookmarkList.slice(moveToIndex + 1)
                        ]
                    }else if(moveToIndex < index) {
                        return [
                            ...bookmarkList.slice(0, moveToIndex),
                            res.value.target,
                            ...bookmarkList.slice(moveToIndex + 1, index),
                            res.value.origin,
                            ...bookmarkList.slice(index + 1)
                        ]
                    }else{
                        return [
                            ...bookmarkList.slice(0, index),
                            res.value.target,
                            ...bookmarkList.slice(index + 1)
                        ]
                    }
                }
                return []
            })
        }
    }, [setBookmarkList])

    const deletePage = useCallback(async (bookmarkId: number, pageId: number) => {
        const res = await bookmarks.deletePage(bookmarkId, pageId)
        if(res.ok) {
            setBookmarkList(bookmarkList => {
                if(bookmarkList) {
                    const index = bookmarkList.findIndex(i => i.bookmarkId === bookmarkId)
                    const b = bookmarkList[index]
                    const pageIndex = b.pages.findIndex(p => p.pageId === pageId)
                    return [
                        ...bookmarkList.slice(0, index),
                        {
                            ...b,
                            pages: [...b.pages.slice(0, pageIndex), ...b.pages.slice(pageIndex + 1)]
                        },
                        ...bookmarkList.slice(index + 1)
                    ]
                }
                return []
            })
        }
    }, [setBookmarkList])

    return {bookmarkList, errorMessage, addBookmark, updateBookmark, deleteBookmark, addPage, updatePage, movePage, deletePage, clearErrorMessage}
}

export function useGroupList() {
    const [groupList, setGroupList] = useAsyncLoading(groups.getGroups)
    const [errorMessage, setErrorMessage] = useState<{keyPath: string | null, error: "ALREADY_EXISTS" | "ITEM_OCCUPIED" | "GROUP_OCCUPIED"} | null>(null)

    const clearErrorMessage = () => setErrorMessage(null)

    const addGroup = async (form: GroupModel): Promise<boolean> => {
        const res = await groups.addGroup(form)
        if(res.ok) {
            setGroupList([...(groupList ?? []), res.value])
            if(errorMessage !== null) setErrorMessage(null)
            return true
        }else if(res.err === "ALREADY_EXISTS") {
            setErrorMessage({keyPath: null, error: res.err})
        }
        return false
    }

    const updateGroup = async (index: number, form: GroupModel) => {
        if(groupList && index >= 0 && index < groupList.length) {
            const old = groupList[index]
            if(old.groupKeyPath === form.groupKeyPath) {
                const res = await groups.updateGroup(form)
                if(res.ok) {
                    setGroupList([...groupList.slice(0, index), res.value, ...groupList.slice(index + 1)])
                    if(errorMessage !== null) setErrorMessage(null)
                }else if(res.err === "ITEM_OCCUPIED") {
                    setErrorMessage({keyPath: form.groupKeyPath, error: res.err})
                }
            }
        }
    }

    const deleteGroup = async (index: number) => {
        if(groupList && index >= 0 && index < groupList.length) {
            const old = groupList[index]
            const res = await groups.deleteGroup(old.groupKeyPath)
            if(res.ok) {
                setGroupList([...groupList.slice(0, index), ...groupList.slice(index + 1)])
                if(errorMessage !== null) setErrorMessage(null)
            }else if(res.err === "GROUP_OCCUPIED") {
                setErrorMessage({keyPath: old.groupKeyPath, error: res.err})
            }
        }
    }

    return {groupList, addGroup, updateGroup, deleteGroup, errorMessage, clearErrorMessage}
}

export function useBookmarkSelection(options?: BookmarkSelectionOptions) {
    const { afterUpdate} = options ?? {}

    const [selectedIndex, privateSetSelectedIndex] = useState<[number, number | null] | null>(null)

    const [creatingIndex, privateSetCreatingIndex] = useState<[number, number | null] | null>(null)

    const setSelectedIndex = useCallback((idx: [number, number | null] | null) => {
        // if((selectedIndex === null && idx !== null) || (idx === null && selectedIndex !== null) || (selectedIndex !== null && idx !== null && (selectedIndex[0] !== idx[0] || selectedIndex[1] !== idx[1]))) {
        privateSetSelectedIndex(idx)
        privateSetCreatingIndex(null)
        afterUpdate?.()
        // }
    }, [afterUpdate])

    const setCreatingIndex = useCallback((idx: [number, number | null]) => {
        // if((creatingIndex === null && idx !== null) || (idx === null && creatingIndex !== null) || (creatingIndex !== null && idx !== null && (creatingIndex[0] !== idx[0] || creatingIndex[1] !== idx[1]))) {
        privateSetSelectedIndex(null)
        privateSetCreatingIndex(idx)
        afterUpdate?.()
        // }
    }, [afterUpdate])

    return {selectedIndex, creatingIndex, setSelectedIndex, setCreatingIndex}
}

export function useQueryAndFilter(options?: QueryAndFilterOptions) {
    const [queryItem, privateSetQueryItem] = useState<QueryCommonItem>("RECENT_ADDED")

    const [filter, setFilter] = useState<QueryBookmarkFilter | null>(COMMON_QUERY_FILTERS[queryItem])

    const filterDifferent = useMemo(() => {
        let originFilter: QueryBookmarkFilter | null
        if(typeof queryItem === "string") {
            originFilter = COMMON_QUERY_FILTERS[queryItem]
        }else{
            const sq = options?.allStoredQueries?.find(sq => sq.queryId === queryItem)
            originFilter = sq !== undefined ? {search: sq.search, groups: sq.groups, order: sq.order, orderDirection: sq.orderDirection} : null
        }
        if(originFilter === null && filter === null) {
            return false
        }
        return (originFilter?.search !== filter?.search)
            || (!objects.deepEquals(originFilter?.groups, filter?.groups))
            || (originFilter?.order !== filter?.order)
            || (originFilter?.orderDirection !== filter?.orderDirection)
    }, [filter, queryItem, options?.allStoredQueries])

    const setQueryItem = useCallback((newQueryItem: QueryCommonItem) => {
        if(newQueryItem !== queryItem) privateSetQueryItem(newQueryItem)
        if(typeof newQueryItem === "string") {
            setFilter(COMMON_QUERY_FILTERS[newQueryItem])
        }else{
            const sq = options?.allStoredQueries?.find(sq => sq.queryId === newQueryItem)
            setFilter(sq !== undefined ? {search: sq.search, groups: sq.groups, order: sq.order, orderDirection: sq.orderDirection} : null)
        }
    }, [options?.allStoredQueries, queryItem])

    const saveAsNewStoredQuery = useCallback(async (name: string) => {
        if(options?.addStoredQuery) {
            const queryId = await options.addStoredQuery({name, search: filter?.search, groups: filter?.groups, order: filter?.order, orderDirection: filter?.orderDirection})
            setQueryItem(queryId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options?.updateStoredQuery, filter])

    const saveStoredQuery = useCallback(() => {
        if(options?.updateStoredQuery && options?.allStoredQueries && typeof queryItem === "number" && filterDifferent) {
            const name = options.allStoredQueries[queryItem].name
            options.updateStoredQuery(queryItem, {name, search: filter?.search, groups: filter?.groups, order: filter?.order, orderDirection: filter?.orderDirection})
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options?.updateStoredQuery, options?.allStoredQueries, queryItem, filterDifferent, filter])

    useWatch(() => {
        if(typeof queryItem === "number") {
            const sq = options?.allStoredQueries?.find(sq => sq.queryId === queryItem)
            setFilter(sq !== undefined ? {search: sq.search, groups: sq.groups, order: sq.order, orderDirection: sq.orderDirection} : null)
        }
    }, [options?.allStoredQueries])

    return {queryItem, filter, filterDifferent, setQueryItem, saveAsNewStoredQuery, saveStoredQuery, setFilter}
}

export function useStoredQueryList() {
    const [storedQueryList, setStoredQueryList] = useAsyncLoading(storedQueries.getStoredQueries)

    const addStoredQuery = useCallback(async (form: StoredQueryForm): Promise<number> => {
        const res = await storedQueries.addStoredQuery(form)
        setStoredQueryList([...(storedQueryList ?? []), res])
        return res.queryId
    }, [storedQueryList, setStoredQueryList])

    const updateStoredQuery = useCallback(async (index: number, form: StoredQueryForm) => {
        if(storedQueryList && index >= 0 && index < storedQueryList.length) {
            const old = storedQueryList[index]
            const res = await storedQueries.updateStoredQuery(old.queryId, form)
            if(res.ok) {
                setStoredQueryList(([...storedQueryList.slice(0, index), res.value, ...storedQueryList.slice(index + 1)]))
            }
        }
    }, [storedQueryList, setStoredQueryList])

    const moveStoredQuery = useCallback(async (index: number, moveToOrdinal: number) => {
        if(storedQueryList && index >= 0 && index < storedQueryList.length) {
            const old = storedQueryList[index]
            const res = await storedQueries.moveStoredQuery(old.queryId, moveToOrdinal)
            if(res.ok) {
                setStoredQueryList()
            }
        }
    }, [storedQueryList, setStoredQueryList])

    const deleteStoredQuery = useCallback(async (index: number) => {
        if(storedQueryList && index >= 0 && index < storedQueryList.length) {
            const old = storedQueryList[index]
            const res = await storedQueries.deleteStoredQuery(old.queryId)
            if(res.ok) {
                setStoredQueryList(([...storedQueryList.slice(0, index), ...storedQueryList.slice(index + 1)]))
            }
        }
    }, [storedQueryList, setStoredQueryList])

    return {storedQueryList, addStoredQuery, updateStoredQuery, moveStoredQuery, deleteStoredQuery}
}

type QueryCommonItem = "SEARCH" | "RECENT_ADDED" | "RECENT_COLLECTED" | number

const COMMON_QUERY_FILTERS: {[key in QueryCommonItem]: QueryBookmarkFilter | null} = {
    "SEARCH": null,
    "RECENT_ADDED": {limit: 300, order: "createTime", orderDirection: "desc"},
    "RECENT_COLLECTED": {limit: 300, order: "lastCollectTime", orderDirection: "desc"}
}
