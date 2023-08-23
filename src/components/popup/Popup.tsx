import { styled } from "styled-components"
import { Button } from "@/components/universal"
import { SourceInfo, useTabInfo } from "@/functions/active-tab"
import { useServerHealth } from "@/functions/server"

export function Popup() {
    const { sourceInfo, collectSourceData } = useTabInfo()

    return <RootDiv $size={sourceInfo ? "std" : "small"}>
        <ServerStatusNotice/>
        {sourceInfo && <SourceInfoNotice sourceInfo={sourceInfo} onCollect={collectSourceData}/>}
    </RootDiv>
}

function ServerStatusNotice() {
    const { health } = useServerHealth()

    return <HealthDiv $status={health}>
        SERVER STATUS:<span>{health}</span>
    </HealthDiv>
}

function SourceInfoNotice({ sourceInfo, onCollect }: {sourceInfo: SourceInfo, onCollect(): void}) {
    return <TabInfoDiv>
        <p>{sourceInfo.host}</p>
        {sourceInfo.sourceDataPath && <p>{sourceInfo.sourceDataPath.sourceSite} {sourceInfo.sourceDataPath.sourceId} p{sourceInfo.sourceDataPath.sourcePart}/{sourceInfo.sourceDataPath.sourcePartName}</p>}
        <Button size="small" onClick={onCollect}>收集此来源数据</Button>
    </TabInfoDiv>
}

const RootDiv = styled.div<{ $size: "small" | "std" }>`
    width: 300px;
    height: ${p => p.$size === "std" ? "450px" : "300px"};
`

const HealthDiv = styled.div<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    text-align: center;
    > span {
        margin-left: var(--spacing-1);
        color: var(--${p => p.$status === "READY" ? "success" : p.$status === "DISCONNECTED" ? "danger" : "warning"});
    }
`

const TabInfoDiv = styled.div`
    margin-top: var(--spacing-2);
    text-align: center;
`