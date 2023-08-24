import { styled } from "styled-components"
import { Button, SecondaryText } from "@/components/universal"
import { useTabInfo } from "@/services/active-tab"
import { useServerHealth } from "@/functions/server"
import { SourceDataCollectStatus, SourceEditStatus } from "@/functions/server/api-source-data"
import { SourceDataPath } from "@/functions/server/api-all"

export function Popup() {
    return <RootDiv>
        <ServerStatusNotice/>
        <SourceInfoNotice/>
    </RootDiv>
}

function ServerStatusNotice() {
    const { health } = useServerHealth()

    return <HealthDiv $status={health}>
        SERVER STATUS:<span>{health}</span>
    </HealthDiv>
}

function SourceInfoNotice() {
    const { sourceInfo, collectStatus, manualCollectSourceData } = useTabInfo()

    return sourceInfo && <TabInfoDiv>
        <HostDiv>{sourceInfo.host}</HostDiv>
        {sourceInfo.sourceDataPath && <>
            <SourceDataPathNotice {...sourceInfo.sourceDataPath}/>
            {collectStatus !== null && <CollectStatusNotice {...collectStatus}/>}
            <Button size="small" onClick={manualCollectSourceData}>{collectStatus?.collected ? "重新" : ""}收集来源数据</Button>
        </>}
    </TabInfoDiv>
}

function SourceDataPathNotice(path: SourceDataPath) {
    return <SourceDataPathDiv>
        {path.sourceSite}
        <SourceIdBold>{path.sourceId}</SourceIdBold>
        {path.sourcePart !== null && <SourcePartSpan>p{path.sourcePart}</SourcePartSpan>}
        {path.sourcePartName !== null && <SourcePartNameSpan>/{path.sourcePartName}</SourcePartNameSpan>}
    </SourceDataPathDiv>
}

function CollectStatusNotice(props: SourceDataCollectStatus) {
    const collectStatusText = props.collectStatus !== null ? COLLECT_STATUS_DESCRIBE[props.collectStatus] : "无记录"

    const collectTimeText = props.collectTime !== null ? new Date(props.collectTime).toLocaleDateString() : null

    return <div>
        图像:
        <ImageCountSpan $count={props.imageCount}>{props.imageCount > 1 ? `已收集(${props.imageCount}项)` : props.imageCount === 1 ? "已收集" : "未收集"}</ImageCountSpan>
        /来源数据:
        <CollectStatusSpan $status={props.collectStatus}>{collectStatusText}</CollectStatusSpan>
        <SecondaryText>收集时间: {collectTimeText}</SecondaryText>
    </div>
}

const COLLECT_STATUS_DESCRIBE: {[status in SourceEditStatus]: string} = {
    "NOT_EDITED": "未收集",
    "EDITED": "已收集",
    "IGNORED": "标记为忽略",
    "ERROR": "标记为错误"
}

const RootDiv = styled.div`
    width: 300px;
    max-height: 450px;
`

const HealthDiv = styled.div<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    text-align: center;
    margin: var(--spacing-1) 0;
    color: var(--secondary-text-color);
    font-size: var(--font-size-small);
    > span {
        margin-left: var(--spacing-1);
        color: var(--${p => p.$status === "READY" ? "success" : p.$status === "DISCONNECTED" ? "danger" : "warning"});
    }
`

const TabInfoDiv = styled.div`
    margin: var(--spacing-1) var(--spacing-2);
    padding: var(--spacing-1) 0;
    text-align: center;
    border: solid 1px var(--border-color);
    border-radius: var(--radius-size-std);
`

const HostDiv = styled.div`
    font-size: var(--font-size-small);
`

const SourceDataPathDiv = styled.div`
    margin: var(--spacing-2) 0;
`

const SourceIdBold = styled.b`
    margin-left: var(--spacing-1);
`

const SourcePartSpan = styled.span`
    margin-left: var(--spacing-1);
`

const SourcePartNameSpan = styled.span`
    color: var(--secondary-text-color);
`

const ImageCountSpan = styled.span<{ $count: number }>`
    color: var(--${p => p.$count > 0 ? "success" : "text-color"})
`

const CollectStatusSpan = styled.span<{ $status: SourceEditStatus | null }>`
    color: var(--${p => p.$status === "EDITED" ? "success" : p.$status === "ERROR" ? "danger" : p.$status === "IGNORED" ? "secondary" : "text-color" })
`
