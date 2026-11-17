import type {
  AccountRole,
  AccountRoleDefinition,
  AccountRoleKind,
  AccountRoleReview,
  AdminAccountRole,
  AdminAccountRoleQuery,
  AdminBoard,
  AgreementOffer,
  AdminOverview,
  AdminUser,
  AdminUserDetail,
  AdminUserQuery,
  ApiResponse,
  AppLimits,
  Board,
  BoardAgreement,
  BoardDetail,
  BoardInput,
  BoardKindDefinition,
  BoardOwnerChoice,
  BoardPhoto,
  BoardPhotoLocation,
  BoardReview,
  BoardSearch,
  BoardStatus,
  DocumentInput,
  DocumentSummary,
  DocumentType,
  ID,
  OwnerProfile,
  OwnerSuggestion,
  PageQuery,
  PaginatedResponse,
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
} from '@greyboards/types'
import type { GreyboardsAlova } from './client'

/**
 * Typed request methods for every API endpoint. Each call returns an alova
 * Method: `await` it (or call `.send()`) on the server, or pass it to
 * `useRequest` / `usePagination` in the apps.
 *
 * Routes match apps/api/src/routes/api.ts.
 */
export function createEndpoints(alova: GreyboardsAlova) {
  return {
    /** Upload sizes and other limits to check before sending anything. Works signed out. */
    limits: () => alova.Get<ApiResponse<AppLimits>>('/limits', { cacheFor: null }),

    /** The kinds of board, for filters and forms. Works signed out. */
    boardKinds: () => alova.Get<ApiResponse<BoardKindDefinition[]>>('/board-kinds'),
    /** Listed boards inside the map's bounds, or near a point with the nearest first. Works signed out. */
    boards: (params: BoardSearch = {}) => alova.Get<PaginatedResponse<Board>>('/boards', { params, cacheFor: null }),
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

    /** What each marketplace role is for. Works signed out. */
    accountRoles: () => alova.Get<ApiResponse<AccountRoleDefinition[]>>('/account-roles'),

    /** Published pages and policies, in the order admins set. Works signed out. */
    documents: (params: PageQuery & { type?: DocumentType } = {}) => alova.Get<PaginatedResponse<DocumentSummary>>('/documents', { params, cacheFor: null }),
    /** One published page or policy by slug, e.g. `privacy`. Works signed out. */
    document: (slug: string) => alova.Get<ApiResponse<SiteDocument>>(`/documents/${slug}`, { cacheFor: null }),

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
      /** Take on a role. Scouts and billposters wait for a reviewer. */
      takeRole: (kind: AccountRoleKind) => alova.Post<ApiResponse<AccountRole>>('/account/roles', { kind }),
      dropRole: (kind: AccountRoleKind) => alova.Delete<ApiResponse<{ kind: AccountRoleKind }>>(`/account/roles/${kind}`),

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
      sendAgreement: (id: ID) => alova.Post<ApiResponse<BoardAgreement>>(`/account/boards/${id}/agreement`),

      /** The owner profiles the account manages. */
      ownerProfiles: (params: PageQuery = {}) => alova.Get<PaginatedResponse<OwnerProfile>>('/account/owner-profiles', { params, cacheFor: null }),
      /** Add an owner the account manages, such as an agency's client. */
      createOwnerProfile: (data: { name: string }) => alova.Post<ApiResponse<OwnerProfile>>('/account/owner-profiles', data),
      updateOwnerProfile: (id: ID, data: { name: string }) => alova.Put<ApiResponse<OwnerProfile>>(`/account/owner-profiles/${id}`, data),
      /** Text a code to the number on an unclaimed owner profile. */
      claimOwnerProfile: (data: { phone: string }) => alova.Post<ApiResponse<{ sent: true }>>('/account/owner-profiles/claim', data),
      verifyOwnerClaim: (data: { phone: string; code: string }) => alova.Post<ApiResponse<OwnerProfile>>('/account/owner-profiles/claim/verify', data),

      sessions: () => alova.Get<ApiResponse<Session[]>>('/account/sessions', { cacheFor: null }),
      revokeSession: (id: ID) => alova.Delete<ApiResponse<Session>>(`/account/sessions/${id}`),
      revokeOtherSessions: () => alova.Delete<ApiResponse<{ revoked: number }>>('/account/sessions'),

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
      overview: () => alova.Get<ApiResponse<AdminOverview>>('/admin/overview', { cacheFor: null }),
      users: (params: AdminUserQuery = {}) => alova.Get<PaginatedResponse<AdminUser>>('/admin/users', { params, cacheFor: null }),
      /** One account with the marketplace roles it holds. */
      user: (id: ID) => alova.Get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`, { cacheFor: null }),
      /** Change an account's role, or suspend it (`suspended: true`) and let it back in. */
      updateUser: (id: ID, data: { role?: UserRole; suspended?: boolean }) => alova.Put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data),
      /** Marketplace roles to review, oldest first. */
      accountRoles: (params: AdminAccountRoleQuery = {}) => alova.Get<PaginatedResponse<AdminAccountRole>>('/admin/account-roles', { params, cacheFor: null }),
      reviewAccountRole: (id: ID, data: AccountRoleReview) => alova.Put<ApiResponse<AdminAccountRole>>(`/admin/account-roles/${id}`, data),
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
