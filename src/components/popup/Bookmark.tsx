import { Button } from "@/components/universal"

export function BookmarkNotice() {
    const click = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("bookmark.html") })
    }

    return <>
        <Button onClick={click}>Open Bookmark</Button>
    </>
}