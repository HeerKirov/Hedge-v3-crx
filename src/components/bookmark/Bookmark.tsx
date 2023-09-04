import { useState } from "react"
import { Button, Icon, MiddleLayout, StandardSideLayout } from "@/components/universal"
import { bookmarks } from "@/services/bookmarks"
import { useAsyncLoading } from "@/utils/reactivity"
import { BookmarkList } from "./BookmarkList"
import { BookmarkSideBar } from "./BookmarkSideBar"
import { BookmarkDetail } from "./BookmarkDetail"

export function Bookmark() {
    const [bookmarkList] = useAsyncLoading(async () => {
        return await bookmarks.queryBookmarks()
    })

    const [bookmarkSelectedIndex, setBookmarkSelectedIndex] = useState<[number, number | null] | null>(null)

    const left = <BookmarkSideBar/>

    const top = <MiddleLayout 
        right={<>
            <Button><Icon icon="plus" mr={2}/>新建书签</Button>
        </>}
    />

    const content = bookmarkList && <BookmarkList bookmarkList={bookmarkList} selectedIndex={bookmarkSelectedIndex} onUpdateSelectedIndex={setBookmarkSelectedIndex}/>

    const bottom = bookmarkSelectedIndex && <BookmarkDetail/>

    return <StandardSideLayout left={left} top={top} content={content} bottom={bottom} bottomVisible={true}/>
}

