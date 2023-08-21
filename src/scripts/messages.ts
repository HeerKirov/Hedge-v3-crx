import { ServiceSenderMessagesList } from "@/functions/messages"

type OnMessage = <T extends ServiceSenderMessagesList>(msg: T, sender: chrome.runtime.MessageSender) => boolean

export function receiveMessage(onMessage: OnMessage) {
    return function(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void) {
        const m = {type: msg.type, msg: msg.msg, callback}
        onMessage(m, sender)
    }
}
