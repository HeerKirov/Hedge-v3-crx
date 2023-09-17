import { useTabSourceInfo } from "@/hooks/active-tab"
import { Button, FormattedText, Icon, SecondaryText } from "@/components"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus, SourceEditStatus } from "@/functions/server/api-source-data"
import { styled } from "styled-components"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"


export function SourceInfoNotice() {
    const { sourceInfo, collectStatus, manualCollectSourceData } = useTabSourceInfo()

    return sourceInfo ? <TabInfoDiv>
        <FormattedText size="small">{sourceInfo.host}</FormattedText>
        {sourceInfo.sourceDataPath && <>
            <SourceDataPathNotice {...sourceInfo.sourceDataPath}/>
            {collectStatus !== null && <CollectStatusNotice {...collectStatus}/>}
            <Button size="small" onClick={manualCollectSourceData}><Icon icon="cloud-arrow-down" mr={1}/>{collectStatus?.collected ? "重新" : ""}收集来源数据</Button>
        </>}
    </TabInfoDiv> : undefined
}

function SourceDataPathNotice(path: SourceDataPath) {
    return <SourceDataPathDiv>
        {path.sourceSite}
        <SourceIdBold>{path.sourceId}</SourceIdBold>
        {path.sourcePart !== null && <SourcePartSpan>p{path.sourcePart}</SourcePartSpan>}
        {path.sourcePartName !== null && <FormattedText color="secondary">/{path.sourcePartName}</FormattedText>}
    </SourceDataPathDiv>
}

function CollectStatusNotice(props: SourceDataCollectStatus) {
    const collectStatusText = props.collectStatus !== null ? COLLECT_STATUS_DESCRIBE[props.collectStatus] : "无记录"

    const collectTimeText = props.collectTime !== null ? new Date(props.collectTime).toLocaleDateString() : null

    return <CollectStatusDiv>
        图像:
        <FormattedText color={props.imageCount > 0 ? "success" : undefined}>{props.imageCount > 1 ? `已收集(${props.imageCount}项)` : props.imageCount === 1 ? "已收集" : "未收集"}</FormattedText>
        /来源数据:
        <FormattedText color={props.collectStatus === "EDITED" ? "success" : props.collectStatus === "ERROR" ? "danger" : props.collectStatus === "IGNORED" ? "secondary" : undefined}>{collectStatusText}</FormattedText>
        {collectTimeText && <SecondaryText>收集时间: {collectTimeText}</SecondaryText>}
    </CollectStatusDiv>
}

const COLLECT_STATUS_DESCRIBE: {[status in SourceEditStatus]: string} = {
    "NOT_EDITED": "未收集",
    "EDITED": "已收集",
    "IGNORED": "标记为忽略",
    "ERROR": "标记为错误"
}


const TabInfoDiv = styled.div`
    margin: ${SPACINGS[1]} ${SPACINGS[2]};
    padding: ${SPACINGS[1]} 0;
    text-align: center;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const SourceDataPathDiv = styled.div`
    margin: ${SPACINGS[2]} 0 ${SPACINGS[1]} 0;
`

const SourceIdBold = styled.b`
    margin-left: ${SPACINGS[1]};
`

const SourcePartSpan = styled.span`
    margin-left: ${SPACINGS[1]};
`

const CollectStatusDiv = styled.div`
    margin-bottom: ${SPACINGS[1]};
`
