/**
 * App settings admins can change in the dashboard, in the groups it shows them.
 * Each field overrides the config value at `key`; until it is saved, that config value
 * (and so its env variable) is used. Secrets never belong here: they stay in .env.
 * Each group's `icon` is a Lucide icon name.
 */
export default () => {
  return {
    /**
     * Seconds each API process keeps saved settings before reading them again.
     */
    cache_seconds: Number(env('SETTINGS_CACHE_SECONDS', 60)),

    groups: [
      {
        id: 'uploads',
        title: 'Uploads',
        description: 'How big images can be when they arrive.',
        icon: 'upload',
        fields: [
          {
            name: 'max_image_mb',
            key: 'uploads.max_image_mb',
            env: 'UPLOADS_MAX_IMAGE_MB',
            type: 'number',
            label: 'Largest image upload',
            help: 'For board photos, artwork and proof of posting. Bigger files are turned away before they finish uploading.',
            unit: 'MB',
            min: 1,
            max: 200,
          },
          {
            name: 'max_avatar_mb',
            key: 'uploads.max_avatar_mb',
            env: 'UPLOADS_MAX_AVATAR_MB',
            type: 'number',
            label: 'Largest profile photo',
            help: 'For profile photos in account settings.',
            unit: 'MB',
            min: 1,
            max: 50,
          },
        ],
      },
      {
        id: 'accounts',
        title: 'Accounts',
        description: 'Who can sign up.',
        icon: 'users',
        fields: [
          {
            name: 'registration_open',
            key: 'accounts.registration_open',
            env: 'REGISTRATION_OPEN',
            type: 'boolean',
            label: 'Open sign-ups',
            help: 'When off, nobody new can create an account.',
          },
        ],
      },
      {
        id: 'agreements',
        title: 'Owner agreements',
        description: 'What owners agree to when a scout signs their board.',
        icon: 'handshake',
        fields: [
          {
            name: 'owner_share_percent',
            key: 'agreements.owner_share_percent',
            env: 'OWNER_SHARE_PERCENT',
            type: 'number',
            label: 'Owner share',
            help: 'The owner’s part of each booking on a board a scout runs for them. Signed agreements keep the share they were signed with.',
            unit: '%',
            min: 1,
            max: 100,
          },
          {
            name: 'link_days',
            key: 'agreements.link_days',
            env: 'AGREEMENT_LINK_DAYS',
            type: 'number',
            label: 'Signing link lasts',
            help: 'How long the link in the owner’s text keeps working. A new text gives a fresh link.',
            unit: 'days',
            min: 1,
            max: 90,
          },
        ],
      },
      {
        id: 'bookings',
        title: 'Bookings',
        description: 'Commission, the scout’s cut, and how bookings are held.',
        icon: 'calendar-check',
        fields: [
          {
            name: 'commission_percent',
            key: 'bookings.commission_percent',
            env: 'BOOKING_COMMISSION_PERCENT',
            type: 'number',
            label: 'Commission',
            help: 'Taken from the owner on boards they run themselves. On boards a scout runs, the owner’s signed share decides it. Paid bookings keep the split they were paid with.',
            unit: '%',
            min: 0,
            max: 100,
          },
          {
            name: 'scout_share_percent',
            key: 'bookings.scout_share_percent',
            env: 'BOOKING_SCOUT_SHARE_PERCENT',
            type: 'number',
            label: 'Scout’s cut',
            help: 'The scout’s part of the commission on boards they brought in.',
            unit: '% of commission',
            min: 0,
            max: 100,
          },
          {
            name: 'hold_minutes',
            key: 'bookings.hold_minutes',
            env: 'BOOKING_HOLD_MINUTES',
            type: 'number',
            label: 'Hold at checkout',
            help: 'How long dates stay held for someone while they pay.',
            unit: 'minutes',
            min: 5,
            max: 120,
          },
          {
            name: 'lead_days',
            key: 'bookings.lead_days',
            env: 'BOOKING_LEAD_DAYS',
            type: 'number',
            label: 'Notice before going live',
            help: 'Days between booking and the first day on the board, to print and put the artwork up.',
            unit: 'days',
            min: 0,
            max: 60,
          },
          {
            name: 'max_periods',
            key: 'bookings.max_periods',
            env: 'BOOKING_MAX_PERIODS',
            type: 'number',
            label: 'Longest booking',
            help: 'The most weeks or months, by the board’s rate, one booking can cover.',
            unit: 'weeks or months',
            min: 1,
            max: 52,
          },
        ],
      },
      {
        id: 'security',
        title: 'Sign-in',
        description: 'Wrong guesses allowed before a pause.',
        icon: 'shield',
        fields: [
          {
            name: 'max_password_attempts',
            key: 'accounts.max_password_attempts',
            env: 'SIGN_IN_MAX_ATTEMPTS',
            type: 'number',
            label: 'Wrong passwords',
            help: 'For one email from one network, before sign-in pauses.',
            min: 1,
            max: 50,
          },
          {
            name: 'lockout_minutes',
            key: 'accounts.lockout_minutes',
            env: 'SIGN_IN_LOCKOUT_MINUTES',
            type: 'number',
            label: 'Pause length',
            help: 'How long sign-in waits after too many wrong passwords or codes.',
            unit: 'min',
            min: 1,
            max: 1440,
          },
        ],
      },
    ],
  }
}
