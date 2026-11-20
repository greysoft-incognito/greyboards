import { Arkstack } from '@arkstack/contract'
import { FilesystemConfig } from '@arkstack/filesystem'
import path from 'node:path'

/** Folders on the public disk that hold uploads: profile photos, board photos, booking files, ID photos and print photos. */
const UPLOAD_FOLDERS = ['avatars', 'boards', 'bookings', 'identity', 'print-jobs']

export default (): FilesystemConfig => {
  const publicRoot = path.join(Arkstack.rootDir(), './storage/app/public')

  return {
    /**
     * Default filesystem disk to be used by the framework.
     */
    default: env('FILESYSTEM_DISK', 'local'),

    /**
     * Available disks and their configurations.
     *
     * You can configure as many disks as you want, and even have multiple disks
     * using the same driver.
     *
     * Supported drivers: local, ftp, s3
     */
    disks: {
      local: {
        driver: 'local',
        root: path.join(Arkstack.rootDir(), './storage/app'),
        visibility: 'public',
      },
      public: {
        driver: 'local',
        root: publicRoot,
        visibility: 'public',
      },
      ftp: {
        driver: 'ftp',
        host: env('FTP_HOST'),
        username: env('FTP_USERNAME'),
        password: env('FTP_PASSWORD'),
        port: env('FTP_PORT', 21),
        verbose: env('FTP_VERBOSE', false),
        privateKey: env('FTP_PRIVATE_KEY'),
      },
      s3: {
        driver: 's3',
        key: env('AWS_ACCESS_KEY_ID'),
        secret: env('AWS_SECRET_ACCESS_KEY'),
        region: env('AWS_DEFAULT_REGION'),
        bucket: env('AWS_BUCKET'),
        url: env('AWS_URL'),
        endpoint: env('AWS_ENDPOINT'),
        visibility: 'public',
      },
      gcs: {
        driver: 'gcs',
        projectId: env('GOOGLE_CLOUD_PROJECT'),
        keyFilename: env('GOOGLE_APPLICATION_CREDENTIALS'),
        bucket: env('GOOGLE_CLOUD_STORAGE_BUCKET'),
        visibility: 'private',
        usingUniformAcl: true,
      },
    },

    /**
     * Upload folders on the public disk, keyed by their link in `public/`.
     * Local disks sign file links as APP_URL/<folder>/..., so the API serves each folder at that path.
     * `storage:link` also creates these links.
     */
    links: Object.fromEntries(UPLOAD_FOLDERS.map((folder) => [path.join(Arkstack.rootDir(), './public', folder), path.join(publicRoot, folder)])),

    /**
     * Optional file name generator function.
     * If provided, this function will be used to generate unique file names
     * for uploaded files when using the `saveFile` method of the Storage class.
     *
     * @param originalName  The original name of the file
     * @returns             A unique file name
     *
     * fileNameGenerator: (originalName: string) => {
     *     const timestamp = Date.now()
     *     const randomString = Math.random().toString(36).substring(2, 8)
     *     const extension = path.extname(originalName)
     *     const baseName = path.basename(originalName, extension)
     *
     *     return `${baseName}-${timestamp}-${randomString}${extension}`
     * },
     */
  }
}
