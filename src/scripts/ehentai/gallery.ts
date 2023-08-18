import { settings } from "@/functions/setting"

document.addEventListener("DOMContentLoaded", async () => {
    const setting = await settings.get()
    if(setting.tool.ehentai.enableCommentForbidden || setting.tool.ehentai.enableCommentBanned) enableCommentFilter(setting.tool.ehentai.enableCommentForbidden, setting.tool.ehentai.enableCommentBanned ? setting.tool.ehentai.commentBannedList : []) 
})

/**
 * 功能：评论区屏蔽机制。
 * 在给出banList时，将对评论区包含这些屏蔽字的评论进行屏蔽。
 * 在开启forbidden时，将按照一定的规则展开整体屏蔽。主要是用来针对CN用户的。
 */
function enableCommentFilter(forbidden: boolean, banList: string[]) {
    const chineseRegex = /.*[\u4e00-\u9fa5]+.*$/

    function anyBanned(text: string): boolean {
        return banList.some(b => text.includes(b))
    }
    
    const divs = document.querySelectorAll("div#cdiv > div.c1")
    if(forbidden) {
        const chineseUser = []
        const lowScore = []
        const banned = []
    
        for(let i = 0; i < divs.length; ++i) {
            const div = divs[i]
            if(div.querySelector("a[name=ulcomment]")) continue

            const c5 = div.querySelector("div.c5 > span")
            if(c5?.textContent && parseInt(c5.textContent) < -10) {
                lowScore.push(i)
            }
            const c6 = div.querySelector("div.c6")
            if(c6?.textContent) {
                if(chineseRegex.test(c6.textContent)) {
                    chineseUser.push(i)
                }
                if(anyBanned(c6.textContent)) {
                    banned.push(i)
                }
            }
        }
        //当: 评论区出现任意一条屏蔽词时；
        //  或评论区出现至少一条低分评论，且CN评论多于2时；
        //  或CN评论多于20时，
        //  都会对所有的评论展开屏蔽。
        if(chineseUser.length >= 20 || (chineseUser.length >= 2 && lowScore.length >= 1) || banned.length >= 1) {
            const list = [...new Set([...chineseUser, ...lowScore, ...banned]).values()]
            for(const idx of list) {
                const div = divs[idx]
                const c6 = div.querySelector("div.c6")!
                c6.textContent = "<FORBIDDEN>"
            }
        }
    }else{
        for(const div of divs) {
            if(div.querySelector("a[name=ulcomment]")) continue
            const c6 = div.querySelector("div.c6")
            if(c6?.textContent && anyBanned(c6.textContent)) {
                c6.textContent = "<BANNED>"
            }
        }
    }
}
