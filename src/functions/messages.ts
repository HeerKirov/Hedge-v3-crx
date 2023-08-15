import { Result } from "../utils/primitives"
import { SourceDataUpdateForm } from "./server/api-source-data"

//== 类型定义与导出的消息列表

export type MsgTemplate<T extends string, B> = { type: T, msg: B, callback: undefined }

export type MsgTemplateWithCallback<T extends string, B, CB> = { type: T, msg: B, callback(r: CB): void }

export type ServiceSenderMessages = { [T in ServiceSenderMessagesList as T["type"]]: T }

export type CallbackTypes = Extract<ServiceSenderMessagesList, MsgTemplateWithCallback<string, any, any>>["type"];

//=== 联合消息列表

export type ServiceSenderMessagesList = Test | ReportSourceData

//=== 在service worker发送的消息类型定义

type Test = MsgTemplate<"TEST", {test: number}>

type ReportSourceData = MsgTemplateWithCallback<"REPORT_SOURCE_DATA", undefined, Result<SourceDataUpdateForm, Error>>