import { ContentScriptMessagesList, ServiceSenderCallbackTypes, ServiceSenderMessages } from "@/functions/messages"
import { setActiveTabBadge } from "./active-tab"
import { downloadURL } from "@/services/downloads"
import { getSourceData } from "@/services/source-data"

/**
 * service worker: 接收一条消息。
 */
export function receiveMessage(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean | void {
    const message = {type: msg.type, msg: msg.msg, callback} as unknown as ContentScriptMessagesList
    return onMessage(message, sender, callback)
}

/**
 * 发送一条消息到指定的tab。
 */
export function sendMessageToTab<T extends keyof ServiceSenderMessages>(tabId: number, type: T, msg: ServiceSenderMessages[T]["msg"]): T extends ServiceSenderCallbackTypes ? Promise<Parameters<ServiceSenderMessages[T]["callback"]>[0]> : void {
    return chrome.tabs.sendMessage(tabId, {type, msg}) as any
}

function onMessage<T extends ContentScriptMessagesList>(msg: T, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean {
    if(msg.type === "SET_ACTIVE_TAB_BADGE") {
        if(sender.tab?.id) {
            setActiveTabBadge(sender.tab.id, msg.msg.path).finally()
        }
    }else if(msg.type === "DOWNLOAD_URL") {
        downloadURL({url: msg.msg.url, referrer: msg.msg.referrer}).finally()
    }else if(msg.type === "CAPTURE_VISIBLE_TAB") {
        chrome.tabs.captureVisibleTab().then(dataURL => callback(dataURL))
        return true
    }else if(msg.type === "GET_SOURCE_DATA") {
        getSourceData(msg.msg.siteName, msg.msg.sourceId).then(r => callback(r))
        return true
    }
    return false
}
