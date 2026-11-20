import { requestLogger, resora } from '@arkstack/driver-express/middlewares'
import { UploadMiddleware } from '@app/http/middlewares/UploadMiddleware'

import { MiddlewareConfig } from '@arkstack/driver-express/types'
import cors from 'cors'
import { localeMiddleware } from '@arkstack/lang'
import corsConfig from './cors'
import filesystemConfig from './filesystem'
import express from 'express'
import path from 'node:path'
import { useExpressUploadContext } from '@kanun-hq/plugin-file'

export default (): MiddlewareConfig => {
  const cConf = corsConfig()
  const uploads = new UploadMiddleware()

  return {
    global: [
      // Parse application/json
      express.json({
        verify: (req, _res, buffer) => {
          req.rawBody = Buffer.from(buffer)
        },
      }),
      express.urlencoded({ extended: true }),
      cors({
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      }),
      (req, res, next) => uploads.handler(req, res, next).catch(next),
      // Local disks sign file URLs as APP_URL/<path>, so serve each upload folder linked in config/filesystem.ts from there.
      ...Object.entries(filesystemConfig().links).map(([link, folder]) =>
        express.Router().use(
          `/${path.basename(link)}`,
          express.static(folder, {
            immutable: true,
            maxAge: '365d',
            fallthrough: false,
          }),
        ),
      ),
    ],
    before: [
      resora(),
      localeMiddleware(),
      (req, _res, next) => {
        useExpressUploadContext(req as never)
        next()
      },
    ],
    after: [requestLogger()],
  }
}
