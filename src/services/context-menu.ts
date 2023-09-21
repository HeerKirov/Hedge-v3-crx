
export async function installed() {
    await chrome.contextMenus.removeAll()

    chrome.contextMenus.create({
        type: "normal",
        title: "书签",
        id: "open-bookmark-page",
        contexts: ["action"]
    })
}

export function clicked(info: chrome.contextMenus.OnClickData, _?: chrome.tabs.Tab) {
    if(info.menuItemId === "open-bookmark-page") {
        chrome.tabs.create({ url: chrome.runtime.getURL("bookmark.html") }).finally()
    }
}
