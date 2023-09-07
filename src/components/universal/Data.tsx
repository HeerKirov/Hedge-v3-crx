import { useCallback, useMemo, useRef } from "react"

interface DraggableEditListProps<T> {
    items?: T[]
    onUpdateItems?(items: T[]): void
    editable?: boolean
    child?(item: T, index: number): (JSX.Element | string | null)[] | JSX.Element | string | null
    keyOf?(item: T, index: number): string | number
    children?(): (JSX.Element | string | null)[] | JSX.Element | string | null
}

export function DraggableEditList<T>(props: DraggableEditListProps<T>) {

    const rootRef = useRef<HTMLSpanElement | null>(null)

    const dragItemRef = useRef<number | null>(null)

    const dragEventRef = useRef<((e: DragEvent) => void) | null>(null)

    const onDocumentDragover = useCallback((e: DragEvent) => e.preventDefault(), [])

    const memoDom = useMemo(() => {
        const onDocumentDrop = (e: DragEvent) => {
            e.stopPropagation()
            if(props.onUpdateItems && props.items && rootRef.current && dragItemRef.current !== null) {
                if(!rootRef.current.contains(e.target as HTMLElement)) {
                    props.onUpdateItems([...props.items.slice(0, dragItemRef.current), ...props.items.slice(dragItemRef.current + 1)])
                }else{
                    const targetIndex = [...rootRef.current.childNodes.values()].findIndex(n => n === e.target || n.contains(e.target as HTMLElement))
                    if(targetIndex >= 0 && targetIndex !== dragItemRef.current) {
                        if(targetIndex > dragItemRef.current) {
                            props.onUpdateItems([...props.items.slice(0, dragItemRef.current), ...props.items.slice(dragItemRef.current + 1, targetIndex), props.items[dragItemRef.current], ...props.items.slice(targetIndex)])
                        }else{
                            props.onUpdateItems([...props.items.slice(0, targetIndex), props.items[dragItemRef.current], ...props.items.slice(targetIndex, dragItemRef.current), ...props.items.slice(dragItemRef.current + 1)])
                        }
                    }
                }
            }
        }

        const onDragstart = props.items?.map((_, index) => () => {
            dragItemRef.current = index
            dragEventRef.current = onDocumentDrop
            document.addEventListener("drop", dragEventRef.current)
            document.addEventListener("dragover", onDocumentDragover)
        })
    
        const onDragend = () => {
            dragItemRef.current = null
            if(dragEventRef.current !== null) {
                document.removeEventListener("drop", dragEventRef.current)
                dragEventRef.current = null
            }
            document.removeEventListener("dragover", onDocumentDragover)
        }

        return props.items?.map((item, index) => <span key={props.keyOf?.(item, index) ?? index} draggable={props.editable} onDragStart={onDragstart![index]} onDragEnd={onDragend}>
            {props.child?.(item, index)}
        </span>)
    }, [props.items, props.onUpdateItems, props.editable])

    return <span ref={rootRef}>{memoDom}</span>
}