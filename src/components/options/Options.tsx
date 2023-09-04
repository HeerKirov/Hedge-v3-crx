import { useState } from "react"
import { styled } from "styled-components"
import { Button, Icon, StandardSideLayout } from "@/components/universal"
import { useSetting } from "@/functions/setting"
import { usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { OptionsServerPanel } from "./OptionsServer"
import { OptionsToolPanel } from "./OptionsTool"
import { OptionsDownloadPanel } from "./OptionsDownload"
import { OptionsSourceDataPanel } from "./OptionsSourceData"

export function Options() {
    const { setting, saveSetting } = useSetting()

    const [panel, setPanel] = useState<"server" | "tool" | "download" | "sourceData">("server")

    const setSettingPartial = usePartialSet(setting, saveSetting)

    const left = <>
        <Header>Hedge v3 Helper</Header>
        <SideButtonDiv><Button width="100%" type={panel === "server" ? "primary" : undefined} onClick={() => setPanel("server")}><Icon icon="server" mr={2}/>后台服务</Button></SideButtonDiv>
        <SideButtonDiv><Button width="100%" type={panel === "tool" ? "primary" : undefined} onClick={() => setPanel("tool")}><Icon icon="toolbox" mr={2}/>扩展工具</Button></SideButtonDiv>
        <SideButtonDiv><Button width="100%" type={panel === "download" ? "primary" : undefined} onClick={() => setPanel("download")}><Icon icon="download" mr={2}/>文件下载</Button></SideButtonDiv>
        <SideButtonDiv><Button width="100%" type={panel === "sourceData" ? "primary" : undefined}onClick={() => setPanel("sourceData")}><Icon icon="file-invoice" mr={2}/>来源收集</Button></SideButtonDiv>
    </>

    const content = panel === "server" ? <OptionsServerPanel server={setting?.server} onUpdateServer={v => setSettingPartial("server", v)}/> 
        : panel === "tool" ? <OptionsToolPanel tool={setting?.tool} onUpdateTool={v => setSettingPartial("tool", v)}/>
        : panel === "download" ? <OptionsDownloadPanel download={setting?.download} onUpdateDownload={v => setSettingPartial("download", v)}/>
        : <OptionsSourceDataPanel sourceData={setting?.sourceData} onUpdateSourceData={v => setSettingPartial("sourceData", v)}/>

    return <StandardSideLayout left={left} content={content} contentPadding={4}/>
}

const Header = styled.h3`
    text-align: center;
    margin-bottom: ${SPACINGS[6]};
`

const SideButtonDiv = styled.div`
    margin-bottom: ${SPACINGS[1]};
    text-align: center;
`
