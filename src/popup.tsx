import React from "react"
import ReactDOM from "react-dom/client"
import { createGlobalStyle } from "styled-components"
import { server } from "./functions/server"
import { useEndpoint } from "./utils/reactivity"

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)

const GlobalStyle = createGlobalStyle`
    html { 
        min-width: 400px
    }
    p {
        color: red;
    }
`

function App() {
    const { data } = useEndpoint(server.app.health)
    
    return (<>
        <GlobalStyle/>
        <h1>Hedge v3 Helper</h1>
        <p>Server is {data?.status}</p>
    </>)
}
