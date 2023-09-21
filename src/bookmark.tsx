import React from "react"
import ReactDOM from "react-dom/client"
import { Bookmark } from "@/views/bookmark/Bookmark"
import { GlobalStyle } from "@/styles"

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <GlobalStyle/>
        <Bookmark/>
    </React.StrictMode>
)
