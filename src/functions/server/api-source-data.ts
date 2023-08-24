import { LimitAndOffsetFilter, ListResult, OrderList, SimpleIllust, SourceDataPath, mapFromOrderList } from "./api-all"
import { createDataRequest, createPathDataRequest, createPathRequest, createQueryRequest } from "./impl"
import { AlreadyExists, NotFound, ResourceNotExist } from "./exceptions"

export const sourceData = {
    list: createQueryRequest<SourceDataFilter, ListResult<SourceData>, never>("/api/source-data", "GET", {
        parseQuery: mapFromSourceDataFilter
    }),
    create: createDataRequest<SourceDataCreateForm, null, ResourceNotExist<"site", string> | AlreadyExists<"SourceData", "sourceId", number>>("/api/source-data", "POST"),
    bulk: createDataRequest<SourceDataCreateForm[], null, ResourceNotExist<"site", string>>("/api/source-data/bulk", "POST"),
    get: createPathRequest<SourceDataIdentity, DetailSourceData, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "GET"),
    update: createPathDataRequest<SourceDataIdentity, SourceDataUpdateForm, null, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "PATCH"),
    delete: createPathRequest<SourceDataIdentity, null, NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}`, "DELETE"),
    getRelatedImages: createPathRequest<SourceDataIdentity, SimpleIllust[], NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/related-images`),
    getSourceMarks: createPathRequest<SourceDataIdentity, SourceMark[], NotFound>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/source-marks`, "GET"),
    updateSourceMarks: createPathDataRequest<SourceDataIdentity, SourceMarkPartialForm, null, NotFound | ResourceNotExist<"related", number>>(({ sourceSite, sourceId }) => `/api/source-data/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceId)}/source-marks`, "PATCH"),
    getCollectStatus: createDataRequest<SourceDataPath[], SourceDataCollectStatus[], never>("/api/source-data/collect-status", "POST")
}

function mapFromSourceDataFilter(filter: SourceDataFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

export interface SourceDataIdentity { sourceSite: string, sourceId: number }

export type SourceMarkType = "SAME" | "SIMILAR" | "RELATED" | "UNKNOWN"

export type SourceEditStatus = "NOT_EDITED" | "EDITED" | "ERROR" | "IGNORED"

interface BasicSourceData {
    sourceSite: string
    sourceSiteName: string
    sourceId: number
    empty: boolean
    status: SourceEditStatus
    createTime: string
    updateTime: string
}

export interface SourceData extends BasicSourceData {
    tagCount: number
    bookCount: number
    relationCount: number
}

export interface DetailSourceData extends BasicSourceData {
    title: string
    description: string
    tags: SourceTag[]
    books: SourceBook[]
    relations: number[]
    links: string[]
    additionalInfo: SourceAdditionalInfo[]
}

export interface SourceTag {
    code: string
    name: string
    otherName: string | null
    type: string | null
}

export interface SourceBook {
    code: string
    title: string
    otherTitle: string | null
}

export interface SourceAdditionalInfo {
    field: string
    label: string
    value: string
}

export interface SourceMark {
    sourceSite: string
    sourceSiteName: string
    sourceId: number
    markType: SourceMarkType
}

export interface SourceDataCollectStatus {
    source: SourceDataPath
    imageCount: number
    collected: boolean
    collectStatus: SourceEditStatus | null
    collectTime: string | null
}

export interface SourceDataCreateForm extends SourceDataUpdateForm {
    sourceSite: string
    sourceId: number
}

export interface SourceDataUpdateForm {
    status?: SourceEditStatus
    title?: string
    description?: string
    tags?: SourceTagForm[]
    books?: SourceBookForm[]
    relations?: number[]
    links?: string[]
    additionalInfo?: SourceAdditionalInfoForm[]
}

export interface SourceTagForm {
    code: string
    name?: string
    otherName?: string | null
    type?: string | null
}

export interface SourceBookForm {
    code: string
    title?: string
    otherTitle?: string | null
}

export interface SourceAdditionalInfoForm {
    field: string
    value: string
}

export interface SourceMarkPartialForm {
    action: "UPSERT" | "REMOVE"
    sourceSite: string
    sourceId: number
    markType?: SourceMarkType
}

export type SourceDataFilter = SourceDataQueryFilter & LimitAndOffsetFilter

export interface SourceDataQueryFilter {
    query?: string
    order?: OrderList<"rowId" | "sourceId" | "site" | "createTime" | "updateTime">
    status?: SourceEditStatus[]
    site?: string[]
    sourceTag?: string
    imageId?: number
}
