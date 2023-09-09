import { useState } from "react"
import { Button, Icon, MiddleLayout, StandardSideLayout } from "@/components/universal"
import { useBookmarkList, useGroupList } from "@/services/bookmarks"
import { BookmarkList } from "./BookmarkList"
import { BookmarkSideBar } from "./BookmarkSideBar"
import { BookmarkDetail } from "./BookmarkDetail"

export function Bookmark() {
    const { bookmarkList, updateBookmark, updatePage } = useBookmarkList()

    const { groupList } = useGroupList()

    const [bookmarkSelectedIndex, setBookmarkSelectedIndex] = useState<[number, number | null] | null>(null)

    const left = <BookmarkSideBar/>

    const top = <MiddleLayout 
        right={<>
            <Button><Icon icon="plus" mr={2}/>新建书签</Button>
        </>}
    />

    const content = bookmarkList && <BookmarkList bookmarkList={bookmarkList} allGroups={groupList ?? []} selectedIndex={bookmarkSelectedIndex} onUpdateSelectedIndex={setBookmarkSelectedIndex}/>

    const bottom = bookmarkList && bookmarkSelectedIndex && <BookmarkDetail bookmarkList={bookmarkList} allGroups={groupList ?? []} index={bookmarkSelectedIndex} updateBookmark={updateBookmark} updatePage={updatePage}/>

    return <StandardSideLayout left={left} top={top} content={content} bottom={bottom} bottomVisible={true}/>
}
