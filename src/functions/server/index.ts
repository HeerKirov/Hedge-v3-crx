import { BasicException } from "./exceptions"
import { Response } from "./impl"
import { AppHealth, app } from "./api-app"
import { sourceData } from "./api-source-data"

export const server = {
    app,
    sourceData
}

export type { Response, BasicException, AppHealth }