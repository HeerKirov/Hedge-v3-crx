import { settings } from "@/functions/setting"
import { receiveMessage } from "@/services/messages"
import { determiningFilename } from "@/services/downloads"
import { tabCreated, tabUpdated } from "@/services/bookmarks"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"})

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

chrome.tabs.onCreated.addListener(tabCreated)

chrome.tabs.onUpdated.addListener(tabUpdated)

settings.load()
