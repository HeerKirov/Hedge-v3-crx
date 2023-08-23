import { Result } from "@/utils/primitives"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { SourceDataPath } from "./server/api-all"

//== 消息函数 ==

/**
 * service worker: 接收一条消息。
 */
export function receiveMessageForServiceWorker(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void): boolean | void {
    
}

/**
 * tab: 接收一条消息。
 */
export function receiveMessageForTab(onMessage: <T extends ServiceSenderMessagesList>(msg: T, sender: chrome.runtime.MessageSender) => boolean) {
    return function(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void) {
        const m = {type: msg.type, msg: msg.msg, callback}
        onMessage(m, sender)
    }
}


/**
 * 发送一条消息到指定的tab。
 */
export function sendMessageToTab<T extends keyof ServiceSenderMessages>(tabId: number, type: T, msg: ServiceSenderMessages[T]["msg"]): T extends CallbackTypes ? Promise<Parameters<ServiceSenderMessages[T]["callback"]>[0]> : void {
    return chrome.tabs.sendMessage(tabId, {type, msg}) as any
}

//== 类型定义与导出的消息列表 ==

export type MsgTemplate<T extends string, B> = { type: T, msg: B, callback: undefined }

export type MsgTemplateWithCallback<T extends string, B, CB> = { type: T, msg: B, callback(r: CB): void }

export type ServiceSenderMessages = { [T in ServiceSenderMessagesList as T["type"]]: T }

export type CallbackTypes = Extract<ServiceSenderMessagesList, MsgTemplateWithCallback<string, any, any>>["type"];

//== 联合消息列表 ==

export type ServiceSenderMessagesList = Test | ReportSourceData | ReportSourceDataPath

//== 在service worker发送的消息类型定义 ==

type Test = MsgTemplate<"TEST", {test: number}>

type ReportSourceData = MsgTemplateWithCallback<"REPORT_SOURCE_DATA", undefined, Result<SourceDataUpdateForm, Error>>

type ReportSourceDataPath = MsgTemplateWithCallback<"REPORT_SOURCE_DATA_PATH", undefined, SourceDataPath>