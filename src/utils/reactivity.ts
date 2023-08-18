import { useEffect, useState } from "react"

export function usePartialSet<T extends object>(value: T | null | undefined, setValue?: (v: T) => void) {
    return function<K extends keyof T>(key: K, newValue: T[K]) {
        if(value !== null && value !== undefined && setValue) {
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