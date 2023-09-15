import { styled } from "styled-components"
import { useServerHealth } from "@/functions/server"
import { BookmarkNotice } from "./Bookmark"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, FONT_SIZES, SPACINGS } from "@/styles"
import { SourceInfoNotice } from "@/views/popup/SourceInfo"

export function Popup() {
    return <RootDiv>
        <ServerStatusNotice/>
        <SourceInfoNotice/>
        <BookmarkNotice/>
    </RootDiv>
}

function ServerStatusNotice() {
    const { health } = useServerHealth()

    return <HealthDiv $status={health}>
        SERVER STATUS:<span>{health}</span>
    </HealthDiv>
}


const RootDiv = styled.div`
    width: 300px;
    max-height: 600px;
    user-select: none;
`

const HealthDiv = styled.div<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    text-align: center;
    margin: ${SPACINGS[1]} 0;
    color: ${LIGHT_MODE_COLORS["secondary-text"]};
    font-size: ${FONT_SIZES["small"]};
    > span {
        margin-left: ${SPACINGS[1]};
        color: ${p => LIGHT_MODE_COLORS[p.$status === "READY" ? "text" : p.$status === "DISCONNECTED" ? "danger" : "warning"]};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["secondary-text"]};
        > span {
            color: ${p => DARK_MODE_COLORS[p.$status === "READY" ? "text" : p.$status === "DISCONNECTED" ? "danger" : "warning"]};
        }
    }
`
