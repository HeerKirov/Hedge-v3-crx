import { settings } from "@/functions/setting"
import { databases } from "@/functions/database"
import { receiveMessage } from "@/services/messages"
import { determiningFilename } from "@/services/downloads"
import { tabCreated, tabUpdated } from "@/services/active-tab"
import { contextMenuClicked, installed } from "@/services/context-menu"
import { notificationButtonClicked } from "@/services/notification"
import { command } from "@/services/commands"

chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"}).finally()

chrome.runtime.onInstalled.addListener(installed)

chrome.runtime.onMessage.addListener(receiveMessage)

chrome.commands.onCommand.addListener(command)

chrome.notifications.onButtonClicked.addListener(notificationButtonClicked)

chrome.downloads.onDeterminingFilename.addListener(determiningFilename)

chrome.tabs.onCreated.addListener(tabCreated)

chrome.tabs.onUpdated.addListener(tabUpdated)

chrome.contextMenus.onClicked.addListener(contextMenuClicked)

settings.load().finally()

databases.load().finally()
