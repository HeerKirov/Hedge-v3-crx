import { useEffect, useRef, useState } from "react"
import { BasicException } from "./exceptions"
import { Response } from "./impl"
import { AppHealth, app } from "./api-app"
import { sourceData } from "./api-source-data"

export const server = {
    app,
    sourceData
}

export function useServerHealth() {
    const [health, setData] = useState<AppHealth["status"] | "DISCONNECTED" | "UNKNOWN">("UNKNOWN")

    const loading = useRef(false)

    const refreshHealth = () => {
        if(!loading.current) {
            loading.current = true
            setData("UNKNOWN")
            server.app.health().then(res => {
                if(res.ok) {
                    setData(res.data.status)
                }
            }).catch(_ => {
                setData("DISCONNECTED")
            }).finally(() => {
                loading.current = false
            })
        }
    }

    useEffect(refreshHealth, [])
    
    return {health, refreshHealth}
}

export function useEndpoint<T, E extends BasicException>(endpoint: () => Promise<Response<T, E>>) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<E | null>(null)

    const loading = useRef(false)

    useEffect(() => {
        if(!loading.current) {
            loading.current = true
            endpoint().then(res => {
                if(res.ok) {
                    setData(res.data)
                }else{
                    setError(res.exception)
                }
                loading.current = false
            })
        }
    }, [])
    
    return {data, error}
}