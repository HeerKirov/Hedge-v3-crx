import { useState } from "react"
import { styled } from "styled-components"
import { Button } from "@/components/universal"
import { useSetting } from "@/functions/setting"
import { usePartialSet } from "@/utils/reactivity"
import { OptionsServerPanel } from "./OptionsServer"
import { OptionsToolPanel } from "./OptionsTool"
import { OptionsDownloadPanel } from "./OptionsDownload"
import { OptionsSourceDataPanel } from "./OptionsSourceData"
import { SPACINGS, DARK_MODE_COLORS, LIGHT_MODE_COLORS } from "@/styles"

export function Options() {
    const { setting, saveSetting } = useSetting()

    const [panel, setPanel] = useState<"server" | "tool" | "download" | "sourceData">("server")

    const setSettingPartial = usePartialSet(setting, saveSetting)

    return <RootDiv>
        <RootLeftDiv>
            <Header>Hedge v3 Helper</Header>
            <SideButtonDiv><SideButton type={panel === "server" ? "primary" : undefined} onClick={() => setPanel("server")}>后台服务</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton type={panel === "tool" ? "primary" : undefined} onClick={() => setPanel("tool")}>扩展工具</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton type={panel === "download" ? "primary" : undefined} onClick={() => setPanel("download")}>文件下载</SideButton></SideButtonDiv>
            <SideButtonDiv><SideButton type={panel === "sourceData" ? "primary" : undefined}onClick={() => setPanel("sourceData")}>来源收集</SideButton></SideButtonDiv>
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
    box-sizing: border-box;
    background-color: ${LIGHT_MODE_COLORS["block"]};
    border-right: 1px solid ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["block"]};
        border-right-color: ${DARK_MODE_COLORS["border"]};
    }
`

const RootRightDiv = styled.div`
    position: absolute;
    right: 0; top: 0; bottom: 0; width: calc(100% - 300px);
    padding: 1rem;
    overflow-y: auto;
    box-sizing: border-box;
`

const Header = styled.h3`
    text-align: center;
    margin-bottom: ${SPACINGS[6]};
`

const SideButtonDiv = styled.div`
    margin-bottom: ${SPACINGS[1]};
    text-align: center;
`

const SideButton = styled(Button)`
    width: 100%;
`