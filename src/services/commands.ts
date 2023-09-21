
export function command(command: string, _: chrome.tabs.Tab) {
    if(command === "bookmark") {
        chrome.tabs.create({ url: chrome.runtime.getURL("bookmark.html") }).finally()
    }
}
