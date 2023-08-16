import { setting } from "@/functions/setting"
import { determiningFilename } from "@/services/downloads"
import { receiveMessage } from "@/services/messages"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"})

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

setting.load()

// chrome.contextMenus.create({

// })

// chrome.contextMenus.onClicked.addListener((event, tab) => {
    
// })