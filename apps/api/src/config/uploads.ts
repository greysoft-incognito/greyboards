/**
 * The largest files people can upload. Admins can change these in the dashboard.
 */
export default () => {
  return {
    /**
     * The largest image upload, such as a board photo, in megabytes.
     */
    max_image_mb: Number(env('UPLOADS_MAX_IMAGE_MB', 25)),

    /**
     * The largest profile photo upload, in megabytes.
     */
    max_avatar_mb: Number(env('UPLOADS_MAX_AVATAR_MB', 10)),
  }
}
