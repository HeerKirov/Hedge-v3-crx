import { useEffect, useRef, useState } from "react"

export function usePartialSet<T extends object>(value: T | null | undefined, setValue?: (v: T) => void) {
    return function<K extends keyof T>(key: K, newValue: T[K]) {
        if(value !== null && value !== undefined && setValue && value[key] !== newValue) {
            setValue({...value, [key]: newValue})
        }
    }
}

interface UseEditorProps<T, F> {
    value: T | null | undefined,
    updateValue?(v: T): void
    from(v: T): F
    to(v: F): T
    default(): F
    effect?(v: T | null | undefined): void
}

export function useEditor<T, F extends object>(props: UseEditorProps<T, F>) {
    const [editor, setEditor] = useState(props.default())
    const [changed, setChanged] = useState(false)

    useEffect(() => {
        setEditor(props.value ? props.from(props.value) : props.default())
        props.effect?.(props.value)
    }, [props.value])

    const setProperty = usePartialSet(editor, v => {
        setEditor(v)
        if(!changed) setChanged(true)
    })

    const save = () => {
        setChanged(false)
        props.updateValue?.(props.to(editor))
    }

    return {editor, changed, setProperty, save}
}

interface UseCreatorProps<T, F> {
    updateValue?(v: T): void
    to(v: F): T
    default(): F
    effect?(v: T | null | undefined): void
}

export function useCreator<T, F extends object>(props: UseCreatorProps<T, F>) {
    const [editor, setEditor] = useState(props.default())
    const [changed, setChanged] = useState(false)

    const setProperty = usePartialSet(editor, v => {
        setEditor(v)
        if(!changed) setChanged(true)
    })

    const save = () => {
        const form = props.to(editor)
        setChanged(false)
        setEditor(props.default())
        props.updateValue?.(form)
    }

    return {editor, changed, setProperty, save}
}

interface AsyncLoadingProps<T> {
    default: T
    loading?: T
    failed?: T
    call(): Promise<T>
}

export function useAsyncLoading<T>(props: AsyncLoadingProps<T>): [T, (t?: T) => void]
export function useAsyncLoading<T>(call: () => Promise<T>): [T | null, (t?: T) => void]
export function useAsyncLoading<T>(props: AsyncLoadingProps<T> | (() => Promise<T>)): [T | null, (t?: T) => void] {
    const loading = useRef(false)
    const initialized = useRef(false)
    if(typeof props === "function") {
        const [data, setData] = useState<T | null>(null)
    
        const refresh = () => {
            if(!loading.current) {
                loading.current = true
                props().then(res => setData(res)).finally(() => {
                    loading.current = false
                })
            }
        }

        const set = (newData?: T) => {
            if(newData !== undefined) {
                setData(newData)
            }else{
                refresh()
            }
        }

        useEffect(() => {
            if(!initialized.current) {
                initialized.current = true
                refresh()
            }
        }, [])
    
        return [data, set]
    }else{
        const [data, setData] = useState<T>(props.default)

        const refresh = () => {
            if(!loading.current) {
                loading.current = true
                if(props.loading !== undefined) setData(props.loading)
                props.call()
                    .then(res => setData(res))
                    .catch(() => { if(props.failed !== undefined) setData(props.failed)})
                    .finally(() => { 
                        loading.current = false
                     })
            }
        }

        const set = (newData?: T) => {
            if(newData !== undefined) {
                setData(newData)
            }else{
                refresh()
            }
        }

        useEffect(() => {
            if(!initialized.current) {
                initialized.current = true
                refresh()
            }
        }, [])
    
        return [data, set]
    }
}