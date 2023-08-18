import { useState } from "react"
import { styled } from "styled-components"
import { useSetting } from "@/functions/setting"
import { usePartialSet } from "@/utils/reactivity"
import { OptionsServerPanel } from "./OptionsServer"
import { OptionsToolPanel } from "./OptionsTool"
import { OptionsDownloadPanel } from "./OptionsDownload"
import { OptionsSourceDataPanel } from "./OptionsSourceData"

export function Options() {
    const { setting, saveSetting } = useSetting()

    const [panel, setPanel] = useState<"server" | "tool" | "download" | "sourceData">("server")

    const setSettingPartial = usePartialSet(setting, saveSetting)

    return <RootDiv>
        <RootLeftDiv>
            <Header>Hedge v3 Helper</Header>
            <SideButtonDiv><SideButton onClick={() => setPanel("server")}>后台服务</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton onClick={() => setPanel("tool")}>扩展工具</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton onClick={() => setPanel("download")}>文件下载</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton onClick={() => setPanel("sourceData")}>来源收集</SideButton></SideButtonDiv>
        </RootLeftDiv>
        <RootRightDiv>
            { panel === "server" ? <OptionsServerPanel server={setting?.server} onUpdateServer={v => setSettingPartial("server", v)}/> 
            : panel === "tool" ? <OptionsToolPanel tool={setting?.tool} onUpdateTool={v => setSettingPartial("tool", v)}/>
            : panel === "download" ? <OptionsDownloadPanel download={setting?.download} onUpdateDownload={v => setSettingPartial("download", v)}/>
            : <OptionsSourceDataPanel sourceData={setting?.sourceData} onUpdateSourceData={v => setSettingPartial("sourceData", v)}/> }
        </RootRightDiv>
    </RootDiv>
}

const RootDiv = styled.div`
    position: fixed;
    left: 0; top: 0; bottom: 0; right: 0;
    overflow: hidden;
`

const RootLeftDiv = styled.div`
    position: absolute;
    left: 0; top: 0; bottom: 0; width: 300px;
    padding: 1rem;
`

const RootRightDiv = styled.div`
    position: absolute;
    right: 0; top: 0; bottom: 0; width: calc(100% - 300px);
    padding: 1rem;
    overflow-y: auto;
`

const Header = styled.h1`
    
`

const SideButtonDiv = styled.div`
    
`

const SideButton = styled.button`
    
`