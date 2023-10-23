import { useCallback } from "react"
import { Button, Icon, MiddleLayout, StandardSideLayout } from "@/components"
import { BookmarkForm, PageForm, QueryBookmarkFilter, } from "@/services/bookmarks"
import { useBookmarkList, useBookmarkSelection, useGroupList, useQueryAndFilter, useStoredQueryList } from "@/hooks/bookmarks"
import { useWatch } from "@/utils/reactivity"
import { BookmarkList } from "./BookmarkList"
import { BookmarkSideBar } from "./BookmarkSideBar"
import { BookmarkCreation, BookmarkDetail } from "./BookmarkDetail"

export function Bookmark() {
    const { groupList } = useGroupList()

    const { storedQueryList, addStoredQuery, updateStoredQuery, moveStoredQuery, deleteStoredQuery } = useStoredQueryList()

    const { queryItem, filter, filterDifferent, setQueryItem, saveStoredQuery, saveAsNewStoredQuery, setFilter } = useQueryAndFilter({allStoredQueries: storedQueryList, addStoredQuery, updateStoredQuery})

    const { bookmarkList, errorMessage, addBookmark, updateBookmark, deleteBookmark, addPage, updatePage, movePage, deletePage, clearErrorMessage } = useBookmarkList({filter})

    const { selectedIndex, creatingIndex, setSelectedIndex, setCreatingIndex } = useBookmarkSelection({afterUpdate: clearErrorMessage})

    const addBookmarkAndSelect = useCallback(async (bookmark: BookmarkForm) => {
        const ok = await addBookmark(bookmark)
        if(ok && creatingIndex !== null) setSelectedIndex([creatingIndex[0], null])
        return ok
    }, [addBookmark, creatingIndex, setSelectedIndex])

    const addPageAndSelect = useCallback(async (index: number, pageIndex: number, page: PageForm) => {
        const ok = await addPage(index, pageIndex, page)
        if(ok && creatingIndex !== null) setSelectedIndex([index, pageIndex])
    }, [addPage, creatingIndex, setSelectedIndex])

    const deleteStoredQueryAndReset = useCallback(async (index: number) => {
        await deleteStoredQuery(index)
        if(storedQueryList?.[index].queryId === queryItem) setQueryItem("SEARCH")
    }, [deleteStoredQuery, storedQueryList, queryItem, setQueryItem])

    const setFilterAndCleanSelected = useCallback((filter: QueryBookmarkFilter | null) => {
        setFilter(filter)
        setSelectedIndex(null)
    }, [setFilter, setSelectedIndex])

    const setCreatingIndexToEnd = useCallback(() => {
        if(bookmarkList !== null) {
            setCreatingIndex([bookmarkList.length, null])
        }
    }, [bookmarkList, setCreatingIndex])

    useWatch(() => { if(selectedIndex !== null || creatingIndex !== null) setSelectedIndex(null) }, [filter])

    const left = (
        <BookmarkSideBar
            queryItem={queryItem} filter={filter} filterDifferent={filterDifferent}
            storedQueries={storedQueryList} allGroups={groupList}
            onUpdateQueryItem={setQueryItem}
            onUpdateFilter={setFilterAndCleanSelected}
            onSaveStoredQueryFromFilter={saveStoredQuery}
            onSaveNewStoredQueryFromFilter={saveAsNewStoredQuery}
            onMoveStoredQuery={moveStoredQuery}
            onUpdateStoredQuery={updateStoredQuery}
            onDeleteStoredQuery={deleteStoredQueryAndReset}
        />
    )

    const top = (
        <MiddleLayout 
            right={<Button onClick={setCreatingIndexToEnd}><Icon icon="plus" mr={2}/>新建书签</Button>}
        />
    )

    const content = bookmarkList && (
        <BookmarkList 
            bookmarkList={bookmarkList} allGroups={groupList ?? []}
            selectedIndex={selectedIndex} creatingIndex={creatingIndex} 
            onUpdateSelectedIndex={setSelectedIndex} onUpdateCreatingIndex={setCreatingIndex}
            onDeleteBookmark={deleteBookmark} onDeletePage={deletePage} onMovePage={movePage}
        />
    )

    const bottom = bookmarkList && (
        selectedIndex ? (
            <BookmarkDetail bookmarkList={bookmarkList} allGroups={groupList ?? []} errorMessage={errorMessage} index={selectedIndex} updateBookmark={updateBookmark} updatePage={updatePage}/>
        ) : creatingIndex ? (
            <BookmarkCreation key={`${creatingIndex[0]}-${creatingIndex[1]}`} bookmarkList={bookmarkList} allGroups={groupList ?? []} errorMessage={errorMessage} index={creatingIndex} addBookmark={addBookmarkAndSelect} addPage={addPageAndSelect}/>
        ) : undefined
    )

    return <StandardSideLayout left={left} top={top} content={content} bottom={bottom}/>
}
