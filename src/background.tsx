import { settings } from "@/functions/setting"
import { databases } from "@/functions/database"
import { receiveMessage } from "@/services/messages"
import { determiningFilename } from "@/services/downloads"
import { tabCreated, tabUpdated } from "@/services/active-tab"
import { clicked, installed } from "@/services/context-menu"
import { command } from "@/services/commands"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"}).finally()

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

chrome.tabs.onCreated.addListener(tabCreated)

chrome.tabs.onUpdated.addListener(tabUpdated)

chrome.runtime.onInstalled.addListener(installed)

chrome.contextMenus.onClicked.addListener(clicked)

chrome.commands.onCommand.addListener(command)

settings.load().finally()

databases.load().finally()
