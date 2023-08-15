import { useEffect, useRef, useState } from "react"
import { BasicException } from "../functions/server/exceptions"
import { Response } from "../functions/server/impl"
import { Setting, setting } from "../functions/setting"

export function useEndpoint<T, E extends BasicException>(endpoint: () => Promise<Response<T, E>>): { data: T | null, error: E | null } {
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

export function useSetting(): Setting | null {
    const [data, setData] = useState<Setting | null>(null)

    const loading = useRef(false)

    useEffect(() => {
        if(!loading.current) {
            loading.current = true
            setting.get().then(res => {
                setData(res)
                loading.current = false
            })
        }
    }, [])
    
    return data
}