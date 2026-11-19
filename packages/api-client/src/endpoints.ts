import type {
  CurrencyInfo,
  PaymentProviderOption,
  PaymentRegion,
  PaymentRegionInput,
  ReputationAdjustment,
  ReputationDisclosure,
  ReputationEvent,
  ApiKey,
  ApiKeyAbility,
  NewApiKey,
  PublishedReview,
  RatingSummary,
  ReviewInput,
  Prospect,
  ProspectInput,
  ProspectQuery,
  ProspectStage,
  Task,
  Territory,
  TerritoryInput,
  CampaignReport,
  CampaignReportInput,
  CampaignReportSummary,
  AdminDispute,
  Dispute,
  DisputeInput,
  DisputeResolution,
  BookingMessage,
  ShareInvite,
  Auction,
  AuctionInput,
  Offer,
  OfferInput,
  OfferQuery,
  AccountRole,
  AccountRoleDefinition,
  AccountRoleKind,
  AccountRoleReview,
  AdminAccountRole,
  AdminAccountRoleQuery,
  AdminBoard,
  AdminOverview,
  AdminUser,
  AdminUserDetail,
  AdminUserQuery,
  AgreementOffer,
  ApiResponse,
  AppLimits,
  ArtworkReview,
  AvailabilityBlockInput,
  Board,
  BoardFaceInput,
  IdentityDocumentDefinition,
  IdentityInput,
  IdentityReview,
  NearbyBoard,
  OwnerPriceQuote,
  BoardImportInput,
  BoardImportResult,
  PriceRuleInput,
  PriceRuleResult,
  PriceGuide,
  PriceGuideQuery,
  Daypart,
  SlotQuote,
  PartnerChecks,
  BoardAgreement,
  BoardDetail,
  BoardInput,
  BoardKindDefinition,
  BoardOwnerChoice,
  BoardPhoto,
  BoardPhotoLocation,
  BoardPinSearch,
  BoardPinsResponse,
  BoardReview,
  BoardSearch,
  BoardStatus,
  BookedDays,
  Booking,
  BookingInput,
  BookingQuery,
  DocumentInput,
  DocumentSummary,
  DocumentType,
  ID,
  OwnerProfile,
  OwnerSuggestion,
  PageQuery,
  PaginatedResponse,
  Payment,
  DispatchRate,
  DispatchRateInput,
  PrintJob,
  PrintJobSearch,
  PrintOffer,
  PrintOptions,
  SharedBooking,
  SharedBookingQuery,
  ProofPhoto,
  ProofPhotoLocation,
  BookingProof,
  PermissionDefinition,
  Role,
  RoleInput,
  Session,
  SettingGroup,
  SignedIn,
  SiteDocument,
  TwoFactorChallenge,
  TwoFactorSetup,
  TwoFactorStatus,
  User,
  UserRole,
  Bank,
  Payout,
  PayoutAccount,
  PayoutAccountInput,
  PayoutStatus,
  PayoutSummary,
} from '@greyboards/types'
import type { GreyboardsAlova } from './client'

/**
 * Typed request methods for every API endpoint. Each call returns an alova
 * Method: `await` it (or call `.send()`) on the server, or pass it to
 * `useRequest` / `usePagination` in the apps.
 *
 * Routes match apps/api/src/routes/api.ts.
 */
/** A form with one file, from a File/Blob on web or an RN `{ uri, name, type }` object. */
function upload(field: string, file: Blob | { uri: string; name: string; type: string }): FormData {
  const form = new FormData()
  const name = (file as { name?: string }).name

  if (name) form.append(field, file as Blob, name)
  else form.append(field, file as Blob)

  return form
}

export function createEndpoints(alova: GreyboardsAlova) {
  return {
    /** Upload sizes and other limits to check before sending anything. Works signed out. */
    limits: () => alova.Get<ApiResponse<AppLimits>>('/limits', { cacheFor: null }),
    /** The currency prices are typed and shown in for `country`, or for the visitor's country. Works signed out. */
    currency: (country?: string | null) => alova.Get<ApiResponse<CurrencyInfo>>('/currency', { params: country ? { country } : {}, cacheFor: null }),

    /** The kinds of board, for filters and forms. Works signed out. */
    boardKinds: () => alova.Get<ApiResponse<BoardKindDefinition[]>>('/board-kinds'),
    /** Listed boards inside the map's bounds, or near a point with the nearest first. Works signed out. */
    boards: (params: BoardSearch = {}) => alova.Get<PaginatedResponse<Board>>('/boards', { params, cacheFor: null }),
    /** Every listed board in the map's view as a light pin, up to a few hundred. Works signed out. */
    boardPins: (params: BoardPinSearch) => alova.Get<BoardPinsResponse>('/boards/pins', { params, cacheFor: null }),
    /** Days already booked on a board, for its calendar. */
    boardAvailability: (id: ID, params: { from?: string; to?: string; faceId?: ID } = {}) => alova.Get<ApiResponse<BookedDays[]>>(`/boards/${id}/availability`, { params, cacheFor: null }),
    /** On a digital screen: its loop, what part of the day costs a slot, and how many slots are free for the dates. */
    boardSlots: (id: ID, params: { faceId?: ID; startsOn?: string; periods?: number; daypart?: Daypart } = {}) =>
      alova.Get<ApiResponse<SlotQuote>>(`/boards/${id}/slots`, { params, cacheFor: null }),
    /** Hold dates on a board while the advertiser pays. */
    bookBoard: (id: ID, data: BookingInput) => alova.Post<ApiResponse<Booking>>(`/boards/${id}/bookings`, data),
    booking: (id: ID) => alova.Get<ApiResponse<Booking>>(`/bookings/${id}`, { cacheFor: null }),
    /** Start paying for held dates. Send the payer to `checkoutUrl`. */
    checkout: (id: ID) => alova.Post<ApiResponse<Payment>>(`/bookings/${id}/checkout`),
    /** The prices on a paid booking's print job, and dispatchers nearby to ask. */
    printOptions: (id: ID) => alova.Get<ApiResponse<PrintOptions>>(`/bookings/${id}/print-offers`, { cacheFor: null }),
    /** Ask one dispatcher to print and post at their rate. */
    requestDispatcher: (id: ID, dispatcherId: ID) => alova.Post<ApiResponse<PrintOffer>>(`/bookings/${id}/print-requests`, { dispatcherId }),
    /** Pay a dispatcher's price. The job is theirs once it's paid. */
    payPrintOffer: (id: ID, offerId: ID) => alova.Post<ApiResponse<Payment>>(`/bookings/${id}/print-offers/${offerId}/checkout`),
    cancelBooking: (id: ID) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/cancel`),
    /** A board's reviews, newest first, with its average under `summary`. */
    boardReviews: (id: ID, params: PageQuery = {}) => alova.Get<PaginatedResponse<PublishedReview> & { summary: RatingSummary }>(`/boards/${id}/reviews`, { params, cacheFor: null }),
    /** Write or change the viewer's review of a booking. */
    review: (id: ID, data: ReviewInput) => alova.Post<ApiResponse<{ id: ID; rating: number; body: string | null }>>(`/bookings/${id}/review`, data),
    /** The scout pipeline: boards a scout spotted, from first sighting to earning. */
    prospects: {
      list: (params: ProspectQuery = {}) => alova.Get<PaginatedResponse<Prospect> & { counts: Record<ProspectStage, number> }>('/account/prospects', { params, cacheFor: null }),
      create: (data: ProspectInput & { name: string; latitude: number; longitude: number }) => alova.Post<ApiResponse<Prospect>>('/account/prospects', data),
      update: (id: ID, data: ProspectInput) => alova.Put<ApiResponse<Prospect>>(`/account/prospects/${id}`, data),
      /** Link the board the scout tagged for it. */
      link: (id: ID, boardId: ID) => alova.Post<ApiResponse<Prospect>>(`/account/prospects/${id}/board`, { boardId }),
      remove: (id: ID) => alova.Delete<ApiResponse<unknown>>(`/account/prospects/${id}`),
    },
    /** The territories staff gave the scout. */
    territories: () => alova.Get<ApiResponse<Territory[]>>('/account/territories', { cacheFor: null }),
    /** What needs doing on the boards the account looks after, and in its pipeline. */
    tasks: () => alova.Get<ApiResponse<Task[]>>('/account/tasks', { cacheFor: null }),
    /** Campaign reports: the advertiser's own, and the shared page anyone with the link opens. */
    reports: {
      list: (params: PageQuery = {}) => alova.Get<PaginatedResponse<CampaignReportSummary>>('/reports', { params, cacheFor: null }),
      /** Bookings whose ads went up, which a report can hold. */
      bookings: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Booking>>('/reports/bookings', { params, cacheFor: null }),
      create: (data: CampaignReportInput) => alova.Post<ApiResponse<CampaignReport>>('/reports', data),
      show: (id: ID) => alova.Get<ApiResponse<CampaignReport>>(`/reports/${id}`, { cacheFor: null }),
      shared: (token: string) => alova.Get<ApiResponse<CampaignReport>>(`/reports/shared/${token}`, { cacheFor: null }),
      /** A new link; the old one stops working. */
      relink: (id: ID) => alova.Post<ApiResponse<{ link: string }>>(`/reports/${id}/link`),
      remove: (id: ID) => alova.Delete<ApiResponse<unknown>>(`/reports/${id}`),
    },
    /** Raise a dispute about a booking, for staff to decide. */
    dispute: (id: ID, data: DisputeInput) => alova.Post<ApiResponse<Dispute>>(`/bookings/${id}/disputes`, data),
    /** A page of a booking's messages, newest first. Reading marks them read. */
    messages: (id: ID, params: PageQuery = {}) => alova.Get<PaginatedResponse<BookingMessage>>(`/bookings/${id}/messages`, { params, cacheFor: null }),
    /** Send a message, a photo, or both. `photo` is a File/Blob on web, or an RN `{ uri, name, type }` object. */
    sendMessage: (id: ID, body: string | null, photo?: Blob | { uri: string; name: string; type: string } | null) => {
      const form = photo ? upload('photo', photo) : new FormData()

      if (body) form.append('body', body)

      return alova.Post<ApiResponse<BookingMessage>>(`/bookings/${id}/messages`, form)
    },
    /** What a shared booking's invite link offers. */
    shareInvite: (token: string) => alova.Get<ApiResponse<ShareInvite>>(`/shares/${token}`, { cacheFor: null }),
    /** Take the share from an invite link, to pay it. */
    claimShare: (token: string) => alova.Post<ApiResponse<Booking>>(`/shares/${token}/claim`),
    /** The organiser takes every unpaid share, to pay the rest themselves. */
    coverShares: (id: ID) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/shares/cover`),
    /** Shared bookings with shares left, for anyone to find and join. */
    openShares: (params: SharedBookingQuery = {}) => alova.Get<ApiResponse<SharedBooking[]>>('/shares/open', { params, cacheFor: null }),
    /** Join a listed shared booking: its first open share is yours to pay. */
    joinShare: (id: ID) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/shares/join`),
    /** Pay for the whole of a shared board once its lock ended. The sharers get their money back. */
    /** Bid for a whole shared board once its lock ended. The first bid opens the bidding. */
    bidToTake: (id: ID, amountMinor: number) => alova.Post<ApiResponse<Auction>>(`/bookings/${id}/takeover`, { amountMinor }),
    /** The winning bidder pays for the whole shared board. */
    payTakeover: (id: ID) => alova.Post<ApiResponse<Payment>>(`/bookings/${id}/takeover/checkout`),
    /** Send the design for a share you hold. Once everyone has, they're merged into the print. */
    sendShareDesign: (id: ID, shareId: ID, file: Blob | { uri: string; name: string; type: string }) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/shares/${shareId}/design`, upload('design', file)),
    /** A board's auctions: the running ones, and recent ones for whoever looks after it. */
    boardAuctions: (id: ID) => alova.Get<ApiResponse<Auction[]>>(`/boards/${id}/auctions`, { cacheFor: null }),
    auction: (id: ID) => alova.Get<ApiResponse<Auction>>(`/auctions/${id}`, { cacheFor: null }),
    /** Place or raise a bid. */
    bid: (id: ID, amountMinor: number) => alova.Post<ApiResponse<Auction>>(`/auctions/${id}/bids`, { amountMinor }),
    /** Offer below the listed price for some dates. */
    makeOffer: (id: ID, data: OfferInput) => alova.Post<ApiResponse<Offer>>(`/boards/${id}/offers`, data),
    /** Agree to an offer, or to its counter. Holds the dates while the advertiser pays. */
    acceptOffer: (id: ID) => alova.Post<ApiResponse<Booking>>(`/offers/${id}/accept`),
    declineOffer: (id: ID) => alova.Post<ApiResponse<Offer>>(`/offers/${id}/decline`),
    counterOffer: (id: ID, amountMinor: number) => alova.Post<ApiResponse<Offer>>(`/offers/${id}/counter`, { amountMinor }),
    withdrawOffer: (id: ID) => alova.Post<ApiResponse<Offer>>(`/offers/${id}/withdraw`),
    /** The advertiser sends the artwork for a paid booking. */
    uploadArtwork: (id: ID, file: Blob | { uri: string; name: string; type: string }) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/artwork`, upload('artwork', file)),
    /** Whoever looks after the board approves the artwork, or sends it back with a note. */
    reviewArtwork: (id: ID, data: ArtworkReview) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/artwork/review`, data),

    /** Proof the ad is up. The dispatcher on the job, or the owner of a board with none, adds photos taken at the board. */
    proofs: {
      add: (id: ID, file: Blob | { uri: string; name: string; type: string }, where: ProofPhotoLocation) => {
        const form = upload('photo', file)

        for (const [key, value] of Object.entries(where)) if (value !== undefined && value !== null) form.append(key, String(value))

        return alova.Post<ApiResponse<ProofPhoto>>(`/bookings/${id}/proofs`, form)
      },
      remove: (id: ID, photo: ID) => alova.Delete<ApiResponse<{ id: ID }>>(`/bookings/${id}/proofs/${photo}`),
      /** Send the photos to the advertiser to check. */
      submit: (id: ID) => alova.Post<ApiResponse<BookingProof>>(`/bookings/${id}/proof/submit`),
      /** The advertiser agrees the ad is up, which pays everyone. */
      accept: (id: ID) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/proof/accept`),
      dispute: (id: ID, note: string) => alova.Post<ApiResponse<Booking>>(`/bookings/${id}/proof/dispute`, { note }),
    },

    /** Print jobs for dispatchers. Needs an active dispatcher role. */
    printJobs: {
      /** Jobs anyone can take near a point, nearest first. */
      near: (params: PrintJobSearch) => alova.Get<ApiResponse<PrintJob[]>>('/print-jobs', { params, cacheFor: null }),
      /** Jobs the dispatcher holds or took. */
      mine: (params: PageQuery = {}) => alova.Get<PaginatedResponse<PrintJob>>('/account/print-jobs', { params, cacheFor: null }),
      show: (id: ID) => alova.Get<ApiResponse<PrintJob>>(`/print-jobs/${id}`, { cacheFor: null }),
      reserve: (id: ID) => alova.Post<ApiResponse<PrintJob>>(`/print-jobs/${id}/reserve`),
      confirm: (id: ID) => alova.Post<ApiResponse<PrintJob>>(`/print-jobs/${id}/confirm`),
      release: (id: ID) => alova.Post<ApiResponse<PrintJob>>(`/print-jobs/${id}/release`),
      /** A photo of the finished print before it goes up. */
      printPhoto: (id: ID, file: Blob | { uri: string; name: string; type: string }) => alova.Post<ApiResponse<PrintJob>>(`/print-jobs/${id}/print-photo`, upload('photo', file)),
      /** Send a price for a job. A new price replaces your earlier one. */
      sendPrice: (id: ID, amountMinor: number, note?: string | null) => alova.Post<ApiResponse<PrintOffer>>(`/print-jobs/${id}/offers`, { amountMinor, note }),
      /** Your prices and the requests made to you, newest first. */
      offers: (params: PageQuery = {}) => alova.Get<PaginatedResponse<PrintOffer>>('/account/print-offers', { params, cacheFor: null }),
      acceptRequest: (offerId: ID) => alova.Post<ApiResponse<PrintOffer>>(`/print-offers/${offerId}/accept`),
      declineRequest: (offerId: ID) => alova.Post<ApiResponse<PrintOffer>>(`/print-offers/${offerId}/decline`),
      withdrawPrice: (offerId: ID) => alova.Delete<ApiResponse<PrintOffer>>(`/print-offers/${offerId}`),
      /** What you charge, and the area you cover. */
      rate: () => alova.Get<ApiResponse<DispatchRate>>('/account/dispatch-rate', { cacheFor: null }),
      saveRate: (input: DispatchRateInput) => alova.Put<ApiResponse<DispatchRate>>('/account/dispatch-rate', input),
    },
    /** Check a payment when the payer comes back from the checkout. */
    verifyPayment: (reference: string) => alova.Post<ApiResponse<Payment>>(`/payments/${encodeURIComponent(reference)}/verify`),
    /** A board and its photos. Unlisted boards show only to their owner, tagger and reviewers. */
    board: (id: ID) => alova.Get<ApiResponse<BoardDetail>>(`/boards/${id}`, { cacheFor: null }),

    /** Owners matching a typed name or number, for tagging a board. Needs an owner or scout role. */
    ownerSuggestions: (search: string) => alova.Get<ApiResponse<OwnerSuggestion[]>>('/owner-profiles', { params: { search }, cacheFor: null }),

    /** An owner reads and signs their agreement from the link in their SMS, without an account. */
    agreements: {
      show: (token: string) => alova.Get<ApiResponse<AgreementOffer>>(`/agreements/${token}`, { cacheFor: null }),
      sendCode: (token: string) => alova.Post<ApiResponse<{ sent: true }>>(`/agreements/${token}/code`),
      sign: (token: string, data: { name: string; code: string }) => alova.Post<ApiResponse<AgreementOffer>>(`/agreements/${token}/sign`, data),
      decline: (token: string) => alova.Post<ApiResponse<AgreementOffer>>(`/agreements/${token}/decline`),
    },

    /** What the two badges mean and what earns reputation points. Works signed out. */
    reputation: () => alova.Get<ApiResponse<ReputationDisclosure>>('/reputation'),

    /** What each marketplace role is for. Works signed out. */
    accountRoles: () => alova.Get<ApiResponse<AccountRoleDefinition[]>>('/account-roles'),

    /** Published pages and policies, in the order admins set. Works signed out. */
    documents: (params: PageQuery & { type?: DocumentType } = {}) => alova.Get<PaginatedResponse<DocumentSummary>>('/documents', { params, cacheFor: null }),
    /** One published page or policy by slug, e.g. `privacy`. Works signed out. */
    document: (slug: string) => alova.Get<ApiResponse<SiteDocument>>(`/documents/${slug}`, { cacheFor: null }),

    banks: () => alova.Get<ApiResponse<Bank[]>>('/banks'),
    auth: {
      /** Signs in, or asks for a two-factor code when the account has it on. */
      login: (data: { email: string; password: string }) =>
        alova.Post<ApiResponse<SignedIn | TwoFactorChallenge>>('/auth/login', data),
      /** Finish a two-factor sign-in with an authenticator `code` or a `recoveryCode`. */
      twoFactor: (data: { challengeToken: string; code?: string; recoveryCode?: string }) =>
        alova.Post<ApiResponse<SignedIn>>('/auth/two-factor', data),
      /** `roles` are the marketplace roles to start with; advertiser when left out. */
      register: (data: { name: string; email: string; password: string; roles?: AccountRoleKind[] }) =>
        alova.Post<ApiResponse<SignedIn>>('/auth/register', data),
      logout: () => alova.Post<ApiResponse<null>>('/auth/logout'),
      me: () => alova.Get<ApiResponse<User>>('/auth/me', { cacheFor: null }),
      forgotPassword: (data: { email: string }) => alova.Post<ApiResponse<{ email: string }>>('/auth/forgot-password', data),
      resetPassword: (data: { token: string; password: string; password_confirmation: string }) =>
        alova.Post<ApiResponse<User>>('/auth/reset-password', data),
      verifyEmail: (data: { token: string; email?: string }) => alova.Post<ApiResponse<User>>('/auth/verify-email', data),
    },

    account: {
      /** Bookings the account made. */
      bookings: (params: BookingQuery = {}) => alova.Get<PaginatedResponse<Booking>>('/account/bookings', { params, cacheFor: null }),
      /** Paid bookings on boards the account tagged or owns, with what each one pays out. */
      boardBookings: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Booking>>('/account/board-bookings', { params, cacheFor: null }),
      /** Auctions the account bid on. */
      bids: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Auction>>('/account/bids', { params, cacheFor: null }),
      /** Offers the account made. */
      offers: (params: OfferQuery = {}) => alova.Get<PaginatedResponse<Offer>>('/account/offers', { params, cacheFor: null }),
      /** Offers on boards the account looks after, the waiting ones first. */
      boardOffers: (params: OfferQuery = {}) => alova.Get<PaginatedResponse<Offer>>('/account/board-offers', { params, cacheFor: null }),
      /** Open a face's dates to bids. */
      openAuction: (id: ID, data: AuctionInput) => alova.Post<ApiResponse<Auction>>(`/account/boards/${id}/auctions`, data),
      /** Close an auction nobody bid on yet. */
      cancelAuction: (id: ID) => alova.Post<ApiResponse<Auction>>(`/auctions/${id}/cancel`),
      updateProfile: (data: { name: string; username?: string }) => alova.Put<ApiResponse<User>>('/account/profile', data),
      /** `file` is a File/Blob on web, or an RN `{ uri, name, type }` object. */
      updateAvatar: (file: Blob | { uri: string; name: string; type: string }) => {
        const form = new FormData()
        const name = (file as { name?: string }).name
        if (name) form.append('avatar', file as Blob, name)
        else form.append('avatar', file as Blob)
        return alova.Post<ApiResponse<User>>('/account/avatar', form)
      },
      removeAvatar: () => alova.Delete<ApiResponse<User>>('/account/avatar'),
      updateEmail: (data: { email: string; password: string }) => alova.Put<ApiResponse<User>>('/account/email', data),
      sendVerification: () => alova.Post<ApiResponse<User>>('/account/email/verification'),
      updatePassword: (data: { currentPassword: string; password: string; password_confirmation: string }) =>
        alova.Put<ApiResponse<User>>('/account/password', data),
      /** Delete the account and everything in it. */
      remove: (data: { password: string }) => alova.Delete<ApiResponse<{ deleted: true }>>('/account', data),

      /** The marketplace roles the account holds, with what each one is for. */
      roles: () => alova.Get<ApiResponse<AccountRole[]> & { definitions: AccountRoleDefinition[] }>('/account/roles', { cacheFor: null }),
      /** Take on a role. Scouts and dispatchers wait for a reviewer. */
      /** What the account has shown for the scout and dispatcher checks. */
      partnerChecks: () => alova.Get<ApiResponse<PartnerChecks> & { documents: IdentityDocumentDefinition[] }>('/account/partner-checks', { cacheFor: null }),
      /** Send a photo of a government ID for review. */
      sendIdentity: (data: IdentityInput, photo: Blob, filename = 'id.jpg') => {
        const form = new FormData()

        form.append('documentType', data.documentType)
        form.append('documentNumber', data.documentNumber)
        form.append('fullName', data.fullName)
        form.append('photo', photo, filename)

        return alova.Post<ApiResponse<PartnerChecks>>('/account/identity', form)
      },
      takeRole: (kind: AccountRoleKind) => alova.Post<ApiResponse<AccountRole>>('/account/roles', { kind }),
      dropRole: (kind: AccountRoleKind) => alova.Delete<ApiResponse<{ kind: AccountRoleKind }>>(`/account/roles/${kind}`),
      /** How one of the account's roles earned and lost points, newest first. */
      reputation: (kind: AccountRoleKind, params: PageQuery = {}) => alova.Get<PaginatedResponse<ReputationEvent>>(`/account/roles/${kind}/reputation`, { params, cacheFor: null }),

      /** Boards the account owns or tagged. */
      boards: (params: PageQuery & { status?: BoardStatus } = {}) =>
        alova.Get<PaginatedResponse<Board>>('/account/boards', { params, cacheFor: null }),
      /** Tag a board, as its owner or as the scout who found it. It waits for review. */
      tagBoard: (data: BoardInput & BoardOwnerChoice & { as: 'owner' | 'scout' }) => alova.Post<ApiResponse<BoardDetail>>('/account/boards', data),
      /** Moving or resizing a listed board sends it back for review. */
      updateBoard: (id: ID, data: Partial<BoardInput>) => alova.Put<ApiResponse<BoardDetail>>(`/account/boards/${id}`, data),
      removeBoard: (id: ID) => alova.Delete<ApiResponse<{ id: ID }>>(`/account/boards/${id}`),
      /** `file` is a File/Blob on web, or an RN `{ uri, name, type }` object. */
      addBoardPhoto: (id: ID, file: Blob | { uri: string; name: string; type: string }, where: BoardPhotoLocation = {}) => {
        const form = new FormData()
        const name = (file as { name?: string }).name

        if (name) form.append('photo', file as Blob, name)
        else form.append('photo', file as Blob)

        for (const [key, value] of Object.entries(where)) if (value !== undefined && value !== null) form.append(key, String(value))

        return alova.Post<ApiResponse<BoardPhoto>>(`/account/boards/${id}/photos`, form)
      },
      removeBoardPhoto: (id: ID, photo: ID) => alova.Delete<ApiResponse<{ id: ID }>>(`/account/boards/${id}/photos/${photo}`),
      /** Text the owner of a scouted board a link to sign, or send the waiting one again. */
      /** Boards already tagged near a spot and facing the same way. */
      nearbyBoards: (params: { lat: number; lng: number; headingDeg?: number | null; except?: ID }) =>
        alova.Get<ApiResponse<NearbyBoard[]>>('/account/boards/nearby', { params, cacheFor: null }),
      /** Add boards from a spreadsheet saved as CSV. `dryRun` checks every row without saving. */
      importBoards: (data: BoardImportInput) => alova.Post<ApiResponse<BoardImportResult>>('/account/boards/import', data),
      /** Change several boards' rates at once. `dryRun` previews it. */
      priceRule: (data: PriceRuleInput) => alova.Post<ApiResponse<PriceRuleResult>>('/account/boards/price-rule', data),
      /** A suggested rate for a board being tagged: boards of the same kind nearby, and what its traffic is worth. */
      priceGuide: (params: PriceGuideQuery) => alova.Get<ApiResponse<PriceGuide>>('/account/boards/price-guide', { params, cacheFor: null }),
      /** Make a token for a digital screen's player. It shows once. */
      issuePlayerToken: (id: ID) => alova.Post<ApiResponse<{ token: string }>>(`/account/boards/${id}/player`),
      revokePlayerToken: (id: ID) => alova.Delete<ApiResponse<{ id: ID }>>(`/account/boards/${id}/player`),
      /** What to list a board at so its owner receives `amountMinor` each period. */
      ownerPrice: (params: { amountMinor?: number | null; as: 'owner' | 'scout' }) =>
        alova.Get<ApiResponse<OwnerPriceQuote>>('/account/boards/owner-price', { params, cacheFor: null }),
      /** Change a face's name, heading or rate card. */
      updateBoardFace: (id: ID, face: ID, data: BoardFaceInput) => alova.Put<ApiResponse<BoardDetail>>(`/account/boards/${id}/faces/${face}`, data),
      /** Keep days off the market, on one face or the whole board. */
      blockDays: (id: ID, data: AvailabilityBlockInput) => alova.Post<ApiResponse<BoardDetail>>(`/account/boards/${id}/blocks`, data),
      unblockDays: (id: ID, block: ID) => alova.Delete<ApiResponse<BoardDetail>>(`/account/boards/${id}/blocks/${block}`),
      sendAgreement: (id: ID) => alova.Post<ApiResponse<BoardAgreement>>(`/account/boards/${id}/agreement`),

      /** The owner profiles the account manages. */
      ownerProfiles: (params: PageQuery = {}) => alova.Get<PaginatedResponse<OwnerProfile>>('/account/owner-profiles', { params, cacheFor: null }),
      /** Add an owner the account manages, such as an agency's client. */
      createOwnerProfile: (data: { name: string }) => alova.Post<ApiResponse<OwnerProfile>>('/account/owner-profiles', data),
      updateOwnerProfile: (id: ID, data: { name: string }) => alova.Put<ApiResponse<OwnerProfile>>(`/account/owner-profiles/${id}`, data),
      payouts: () => alova.Get<ApiResponse<PayoutSummary>>('/account/payouts', { cacheFor: null }),
      payoutHistory: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Payout>>('/account/payouts/history', { params, cacheFor: null }),
      savePayoutAccount: (data: PayoutAccountInput) => alova.Put<ApiResponse<PayoutAccount>>('/account/payout-account', data),
      saveOwnerPayoutAccount: (profileId: ID, data: PayoutAccountInput) => alova.Put<ApiResponse<PayoutAccount>>(`/account/owner-profiles/${profileId}/payout-account`, data),
      /** Text a code to the number on an unclaimed owner profile. */
      claimOwnerProfile: (data: { phone: string }) => alova.Post<ApiResponse<{ sent: true }>>('/account/owner-profiles/claim', data),
      verifyOwnerClaim: (data: { phone: string; code: string }) => alova.Post<ApiResponse<OwnerProfile>>('/account/owner-profiles/claim/verify', data),

      sessions: () => alova.Get<ApiResponse<Session[]>>('/account/sessions', { cacheFor: null }),
      revokeSession: (id: ID) => alova.Delete<ApiResponse<Session>>(`/account/sessions/${id}`),
      revokeOtherSessions: () => alova.Delete<ApiResponse<{ revoked: number }>>('/account/sessions'),

      /** Keys for the public API. */
      apiKeys: () => alova.Get<ApiResponse<ApiKey[]>>('/account/api-keys', { cacheFor: null }),
      /** Make a key. The token in the reply is the only time it shows. */
      createApiKey: (data: { name: string; abilities: ApiKeyAbility[] }) => alova.Post<ApiResponse<NewApiKey>>('/account/api-keys', data),
      removeApiKey: (id: ID) => alova.Delete<ApiResponse<{ id: ID }>>(`/account/api-keys/${id}`),

      twoFactor: () => alova.Get<ApiResponse<TwoFactorStatus>>('/account/two-factor', { cacheFor: null }),
      setupTwoFactor: () => alova.Post<ApiResponse<TwoFactorSetup>>('/account/two-factor/setup'),
      /** Confirm setup with a code from the app. Returns recovery codes, shown once. */
      enableTwoFactor: (data: { code: string }) =>
        alova.Post<ApiResponse<TwoFactorStatus & { recoveryCodes: string[] }>>('/account/two-factor', data),
      regenerateRecoveryCodes: () =>
        alova.Post<ApiResponse<TwoFactorStatus & { recoveryCodes: string[] }>>('/account/two-factor/recovery-codes'),
      disableTwoFactor: (data: { password: string }) => alova.Delete<ApiResponse<TwoFactorStatus>>('/account/two-factor', data),
    },

    /** The admin dashboard. Each area needs a role that grants it (see `User.permissions`). */
    admin: {
      bookings: (params: BookingQuery = {}) => alova.Get<PaginatedResponse<Booking>>('/admin/bookings', { params, cacheFor: null }),
      payouts: (params: PageQuery & { status?: PayoutStatus | null } = {}) => alova.Get<PaginatedResponse<Payout>>('/admin/payouts', { params, cacheFor: null }),
      retryPayout: (id: ID) => alova.Post<ApiResponse<Payout>>(`/admin/payouts/${id}/retry`),
      refundBooking: (id: ID, data: { reason: string }) => alova.Post<ApiResponse<Booking>>(`/admin/bookings/${id}/refund`, data),
      territories: (params: PageQuery = {}) => alova.Get<PaginatedResponse<Territory>>('/admin/territories', { params, cacheFor: null }),
      createTerritory: (data: TerritoryInput) => alova.Post<ApiResponse<Territory>>('/admin/territories', data),
      updateTerritory: (id: ID, data: Partial<TerritoryInput>) => alova.Put<ApiResponse<Territory>>(`/admin/territories/${id}`, data),
      removeTerritory: (id: ID) => alova.Delete<ApiResponse<unknown>>(`/admin/territories/${id}`),
      paymentRegions: (params: PageQuery = {}) => alova.Get<PaginatedResponse<PaymentRegion> & { providers: PaymentProviderOption[] }>('/admin/payment-regions', { params, cacheFor: null }),
      createPaymentRegion: (data: PaymentRegionInput) => alova.Post<ApiResponse<PaymentRegion>>('/admin/payment-regions', data),
      updatePaymentRegion: (id: ID, data: PaymentRegionInput) => alova.Put<ApiResponse<PaymentRegion>>(`/admin/payment-regions/${id}`, data),
      removePaymentRegion: (id: ID) => alova.Delete<ApiResponse<PaymentRegion>>(`/admin/payment-regions/${id}`),
      /** Open disputes oldest first, or decided ones newest first. */
      disputes: (params: PageQuery & { status?: 'open' | 'resolved' } = {}) => alova.Get<PaginatedResponse<AdminDispute>>('/admin/disputes', { params, cacheFor: null }),
      resolveDispute: (id: ID, data: DisputeResolution) => alova.Post<ApiResponse<Dispute>>(`/admin/disputes/${id}/resolve`, data),
      overview: () => alova.Get<ApiResponse<AdminOverview>>('/admin/overview', { cacheFor: null }),
      users: (params: AdminUserQuery = {}) => alova.Get<PaginatedResponse<AdminUser>>('/admin/users', { params, cacheFor: null }),
      /** One account with the marketplace roles it holds. */
      user: (id: ID) => alova.Get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`, { cacheFor: null }),
      /** Change an account's role, or suspend it (`suspended: true`) and let it back in. */
      updateUser: (id: ID, data: { role?: UserRole; suspended?: boolean }) => alova.Put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),
      /** Marketplace roles to review, oldest first. */
      accountRoles: (params: AdminAccountRoleQuery = {}) => alova.Get<PaginatedResponse<AdminAccountRole>>('/admin/account-roles', { params, cacheFor: null }),
      reviewAccountRole: (id: ID, data: AccountRoleReview) => alova.Put<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}`, data),
      /** Accept or turn down an applicant's ID photo on its own. */
      reviewIdentity: (id: ID, data: IdentityReview) => alova.Put<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}/identity`, data),
      /** Give a role the staff-verified badge. */
      verifyAccountRole: (id: ID, data: { note?: string | null } = {}) => alova.Put<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}/verification`, data),
      unverifyAccountRole: (id: ID) => alova.Delete<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}/verification`),
      /** A role's reputation history, newest first. */
      accountRoleReputation: (id: ID, params: PageQuery = {}) => alova.Get<PaginatedResponse<ReputationEvent>>(`/admin/account-roles/${id}/reputation`, { params, cacheFor: null }),
      /** Add or take points by hand, with the reason. */
      adjustReputation: (id: ID, data: ReputationAdjustment) => alova.Post<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}/reputation`, data),
      /** Every role, with the permissions there are to choose from. */
      /** Boards waiting for review, or those with another status. */
      boards: (params: PageQuery & { status?: BoardStatus } = {}) =>
        alova.Get<PaginatedResponse<AdminBoard>>('/admin/boards', { params, cacheFor: null }),
      board: (id: ID) => alova.Get<ApiResponse<AdminBoard>>(`/admin/boards/${id}`, { cacheFor: null }),
      reviewBoard: (id: ID, data: BoardReview) => alova.Put<ApiResponse<AdminBoard>>(`/admin/boards/${id}`, data),

      roles: () => alova.Get<ApiResponse<Role[]> & { permissions: PermissionDefinition[] }>('/admin/roles', { cacheFor: null }),
      createRole: (data: RoleInput) => alova.Post<ApiResponse<Role>>('/admin/roles', data),
      updateRole: (id: ID, data: Partial<RoleInput>) => alova.Put<ApiResponse<Role>>(`/admin/roles/${id}`, data),
      /** Refused for built-in roles and roles someone still has. */
      removeRole: (id: ID) => alova.Delete<ApiResponse<Role>>(`/admin/roles/${id}`),
      /** Every page and policy, drafts too. */
      documents: (params: PageQuery & { type?: DocumentType } = {}) => alova.Get<PaginatedResponse<DocumentSummary>>('/admin/documents', { params, cacheFor: null }),
      document: (id: ID) => alova.Get<ApiResponse<SiteDocument>>(`/admin/documents/${id}`, { cacheFor: null }),
      createDocument: (data: DocumentInput & { title: string; body: string }) => alova.Post<ApiResponse<SiteDocument>>('/admin/documents', data),
      updateDocument: (id: ID, data: DocumentInput) => alova.Put<ApiResponse<SiteDocument>>(`/admin/documents/${id}`, data),
      /** Refused for the built-in privacy policy, terms and about page. */
      removeDocument: (id: ID) => alova.Delete<ApiResponse<SiteDocument>>(`/admin/documents/${id}`),
      settings: () => alova.Get<ApiResponse<SettingGroup[]>>('/admin/settings', { cacheFor: null }),
      /** Save a group's fields by name. Null puts a field back to its .env default. */
      updateSettings: (group: string, values: Record<string, number | boolean | string | null>) =>
        alova.Put<ApiResponse<SettingGroup>>(`/admin/settings/${group}`, values),
    },
  }
}

export type GreyboardsEndpoints = ReturnType<typeof createEndpoints>
