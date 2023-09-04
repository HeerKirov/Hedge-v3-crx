import styled from "styled-components"
import { Button, Icon, Input, Separator } from "@/components/universal"

interface BookmarkSideBarProps {

}

export function BookmarkSideBar(props: BookmarkSideBarProps) {
    return <>
        <Input width="100%" placeholder="搜索书签"/>
        <Separator spacing={2}/>
        <QueryItemButton><Icon icon="calendar" mr={2}/>最近使用</QueryItemButton>
        <QueryItemButton><Icon icon="search" mr={2}/>搜索</QueryItemButton>
        <Separator spacing={2}/>
        <QueryItemButton><Icon icon="folder" mr={2}/>已收录[GN GK]</QueryItemButton>
    </>
}

const QueryItemButton = styled(Button)`
    width: 100%;
    text-align: left;
`