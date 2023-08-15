
export interface ListResult<T> {
    total: number
    result: T[]
}

export interface LimitFilter {
    limit?: number
}

export interface LimitAndOffsetFilter extends LimitFilter {
    offset?: number
}

export interface FilePath {
    original: string
    thumbnail: string
    sample: string
    extension: string
}

export interface NullableFilePath {
    original: string
    thumbnail: string | null
    sample: string | null
    extension: string
}

export interface SourceDataPath {
    sourceSite: string
    sourceId: number
    sourcePart: number | null
    sourcePartName: string | null
}

export interface SimpleIllust {
    id: number
    filePath: FilePath
}

type OrderPrefix = "" | "+" | "-"

type OrderListItem<T extends string> = `${OrderPrefix}${T}`

export type OrderList<T extends string> = OrderListItem<T> | OrderListItem<T>[]

export function mapFromOrderList(orderList: OrderList<string> | null | undefined): string | undefined {
    return orderList == null ? undefined : typeof orderList === "object" ? (orderList.length ? orderList.join(",") : undefined) : orderList
}

export function mapListResult<T, R>(r: ListResult<T>, mapper: (t: T) => R): ListResult<R> {
    return {result: r.result.map(mapper), total: r.total}
}