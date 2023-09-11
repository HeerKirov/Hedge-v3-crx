import { useEffect, useState } from "react"
import { Button, Icon, MiddleLayout, StandardSideLayout } from "@/components"
import { BookmarkForm, PageForm, useBookmarkList, useGroupList } from "@/services/bookmarks"
import { BookmarkList } from "./BookmarkList"
import { BookmarkSideBar } from "./BookmarkSideBar"
import { BookmarkCreation, BookmarkDetail } from "./BookmarkDetail"

export function Bookmark() {
    const { bookmarkList, errorMessage, addBookmark, updateBookmark, deleteBookmark, addPage, updatePage, movePage, deletePage, clearErrorMessage } = useBookmarkList()

    const { groupList } = useGroupList()

    const [bookmarkSelectedIndex, setBookmarkSelectedIndex] = useState<[number, number | null] | null>(null)

    const [bookmarkCreatingIndex, setBookmarkCreatingIndex] = useState<[number, number | null] | null>(null)

    useEffect(clearErrorMessage, [bookmarkCreatingIndex, bookmarkSelectedIndex])

    const setSelectedIndex = (idx: [number, number | null] | null) => {
        setBookmarkSelectedIndex(idx)
        setBookmarkCreatingIndex(null)
    }

    const setCreatingIndex = (idx: [number, number | null]) => {
        setBookmarkSelectedIndex(null)
        setBookmarkCreatingIndex(idx)
    }

    const createInEnd = () => {
        if(bookmarkList !== null) {
            setCreatingIndex([bookmarkList.length, null])
        }
    }

    const addBookmarkWithCallback = async (form: BookmarkForm) => {
        if(bookmarkCreatingIndex !== null && await addBookmark(form)) {
            setSelectedIndex([bookmarkCreatingIndex[0], null])
        }
    }

    const addPageWithCallback = async (index: number, pageIndex: number, form: PageForm) => {
        if(bookmarkCreatingIndex !== null && await addPage(index, pageIndex, form)) {
            setSelectedIndex([index, pageIndex])
        }
    }

    const left = <BookmarkSideBar/>

    const top = <MiddleLayout 
        right={<>
            <Button onClick={createInEnd}><Icon icon="plus" mr={2}/>新建书签</Button>
        </>}
    />

    const content = bookmarkList && <BookmarkList 
        bookmarkList={bookmarkList} allGroups={groupList ?? []} 
        selectedIndex={bookmarkSelectedIndex} creatingIndex={bookmarkCreatingIndex} 
        onUpdateSelectedIndex={setSelectedIndex} onUpdateCreatingIndex={setCreatingIndex}
        onDeleteBookmark={deleteBookmark} onDeletePage={deletePage} onMovePage={movePage}
    />

    const bottom = bookmarkList && (
        bookmarkSelectedIndex ? (
            <BookmarkDetail bookmarkList={bookmarkList} allGroups={groupList ?? []} errorMessage={errorMessage} index={bookmarkSelectedIndex} updateBookmark={updateBookmark} updatePage={updatePage}/>
        ) : bookmarkCreatingIndex ? (
            <BookmarkCreation bookmarkList={bookmarkList} allGroups={groupList ?? []} errorMessage={errorMessage} index={bookmarkCreatingIndex} addBookmark={addBookmarkWithCallback} addPage={addPageWithCallback}/>
        ) : undefined
    )

    return <StandardSideLayout left={left} top={top} content={content} bottom={bottom} bottomVisible={true}/>
}
