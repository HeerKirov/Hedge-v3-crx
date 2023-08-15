import { CallbackTypes, ServiceSenderMessages } from "../functions/messages"

export function receiveMessage(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean | void {
    
}

export function sendMessageToTab<T extends keyof ServiceSenderMessages>(tabId: number, type: T, msg: ServiceSenderMessages[T]["msg"]): T extends CallbackTypes ? Promise<Parameters<ServiceSenderMessages[T]["callback"]>[0]> : void {
    return chrome.tabs.sendMessage(tabId, {type, msg}) as any
}
