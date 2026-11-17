import AccountController from 'src/app/http/controllers/AccountController'
import AccountRoleController from 'src/app/http/controllers/AccountRoleController'
import AccountBoardController from 'src/app/http/controllers/AccountBoardController'
import AgreementController from 'src/app/http/controllers/AgreementController'
import AuthController from 'src/app/http/controllers/AuthController'
import BoardController from 'src/app/http/controllers/BoardController'
import BookingController from 'src/app/http/controllers/BookingController'
import PaymentController from 'src/app/http/controllers/PaymentController'
import OwnerProfileController from 'src/app/http/controllers/OwnerProfileController'
import SessionController from 'src/app/http/controllers/SessionController'
import TwoFactorController from 'src/app/http/controllers/TwoFactorController'
import LimitsController from 'src/app/http/controllers/LimitsController'
import DocumentController from 'src/app/http/controllers/DocumentController'
import AdminAccountRoleController from 'src/app/http/controllers/admin/AccountRoleController'
import AdminBoardController from 'src/app/http/controllers/admin/BoardController'
import AdminBookingController from 'src/app/http/controllers/admin/BookingController'
import AdminDocumentController from 'src/app/http/controllers/admin/DocumentController'
import OverviewController from 'src/app/http/controllers/admin/OverviewController'
import SettingsController from 'src/app/http/controllers/admin/SettingsController'
import RoleController from 'src/app/http/controllers/admin/RoleController'
import UserController from 'src/app/http/controllers/admin/UserController'
import { Authorize } from 'src/app/http/middlewares/Authorize'
import { Router } from '@arkstack/driver-express'
import { auth, limiter } from '@arkstack/driver-express/middlewares'

Router.get('/', () => {
  return { status: 'OK' }
})

// Upload sizes and other limits apps check up front
Router.get('/limits', [LimitsController, 'show'], [limiter(120, 60)])

// Privacy policy, terms, about and other pages admins publish
Router.get('/documents', [DocumentController, 'index'], [limiter(120, 60)])
Router.get('/documents/:document', [DocumentController, 'show'], [limiter(120, 60)])

// Auth
Router.post('/auth/register', [AuthController, 'register'], [limiter(20, 60)])
Router.post('/auth/login', [AuthController, 'login'], [limiter(20, 60)])
Router.post('/auth/two-factor', [AuthController, 'twoFactorChallenge'], [limiter(10, 60)])
Router.post('/auth/forgot-password', [AuthController, 'forgotPassword'], [limiter(5, 60)])
Router.post('/auth/reset-password', [AuthController, 'resetPassword'], [limiter(10, 60)])
Router.post('/auth/verify-email', [AuthController, 'verifyEmail'], [limiter(10, 60)])
Router.get('/auth/me', [AuthController, 'me'], [auth])
Router.post('/auth/logout', [AuthController, 'logout'], [auth])

// Account settings
Router.put('/account/profile', [AccountController, 'updateProfile'], [auth])
Router.post('/account/avatar', [AccountController, 'updateAvatar'], [auth, limiter(20, 60)])
Router.delete('/account/avatar', [AccountController, 'removeAvatar'], [auth])
Router.put('/account/email', [AccountController, 'updateEmail'], [auth, limiter(10, 60)])
Router.post('/account/email/verification', [AccountController, 'sendVerification'], [auth, limiter(3, 60)])
Router.put('/account/password', [AccountController, 'updatePassword'], [auth, limiter(10, 60)])
Router.delete('/account', [AccountController, 'destroy'], [auth, limiter(5, 60)])

// Marketplace roles: advertiser, owner, scout and billposter
Router.get('/account-roles', [AccountRoleController, 'definitions'], [limiter(120, 60)])
Router.get('/account/roles', [AccountRoleController, 'index'], [auth])
Router.post('/account/roles', [AccountRoleController, 'create'], [auth, limiter(20, 60)])
Router.delete('/account/roles/:kind', [AccountRoleController, 'destroy'], [auth])

// Boards: listed ones on the map for everyone, and the ones scouts and owners tag
Router.get('/board-kinds', [BoardController, 'kinds'], [limiter(120, 60)])
Router.get('/boards', [BoardController, 'index'], [limiter(240, 60)])
Router.get('/boards/pins', [BoardController, 'pins'], [limiter(240, 60)])
Router.get('/boards/:board', [BoardController, 'show'], [limiter(240, 60)])
Router.get('/boards/:board/availability', [BookingController, 'availability'], [limiter(120, 60)])
Router.get('/account/boards', [AccountBoardController, 'index'], [auth])
Router.post('/account/boards', [AccountBoardController, 'create'], [auth, Authorize.actingAs('owner', 'scout'), limiter(30, 60)])
Router.put('/account/boards/:board', [AccountBoardController, 'update'], [auth])
Router.delete('/account/boards/:board', [AccountBoardController, 'destroy'], [auth])
Router.post('/account/boards/:board/photos', [AccountBoardController, 'addPhoto'], [auth, limiter(60, 60)])
Router.delete('/account/boards/:board/photos/:photo', [AccountBoardController, 'removePhoto'], [auth])
Router.post('/account/boards/:board/agreement', [AccountBoardController, 'sendAgreement'], [auth, limiter(10, 60)])

// Owner profiles: suggestions while tagging, the ones an account manages, and claiming one by phone
Router.get('/owner-profiles', [OwnerProfileController, 'suggest'], [auth, Authorize.actingAs('owner', 'scout'), limiter(120, 60)])
Router.get('/account/owner-profiles', [OwnerProfileController, 'index'], [auth])
Router.post('/account/owner-profiles', [OwnerProfileController, 'create'], [auth, Authorize.actingAs('owner'), limiter(20, 60)])
Router.put('/account/owner-profiles/:profile', [OwnerProfileController, 'update'], [auth])
Router.post('/account/owner-profiles/claim', [OwnerProfileController, 'startClaim'], [auth, limiter(5, 60)])
Router.post('/account/owner-profiles/claim/verify', [OwnerProfileController, 'finishClaim'], [auth, limiter(10, 60)])

// Owners sign by SMS from a link, without an account
Router.get('/agreements/:token', [AgreementController, 'show'], [limiter(60, 60)])
Router.post('/agreements/:token/code', [AgreementController, 'sendCode'], [limiter(5, 60)])
Router.post('/agreements/:token/sign', [AgreementController, 'sign'], [limiter(10, 60)])
Router.post('/agreements/:token/decline', [AgreementController, 'decline'], [limiter(10, 60)])

// Signed-in devices
Router.get('/account/sessions', [SessionController, 'index'], [auth])
Router.delete('/account/sessions', [SessionController, 'destroyOthers'], [auth])
Router.delete('/account/sessions/:session', [SessionController, 'destroy'], [auth])

// Two-step sign-in
Router.get('/account/two-factor', [TwoFactorController, 'show'], [auth])
Router.post('/account/two-factor/setup', [TwoFactorController, 'setup'], [auth])
Router.post('/account/two-factor', [TwoFactorController, 'enable'], [auth, limiter(10, 60)])
Router.post('/account/two-factor/recovery-codes', [TwoFactorController, 'regenerateRecoveryCodes'], [auth])
Router.delete('/account/two-factor', [TwoFactorController, 'disable'], [auth, limiter(10, 60)])

// Admin dashboard. Each area needs a role that grants it.
Router.get('/admin/overview', [OverviewController, 'show'], [auth, Authorize.to('dashboard.view')])
Router.get('/admin/users', [UserController, 'index'], [auth, Authorize.to('users.view', 'users.manage')])
Router.get('/admin/users/:user', [UserController, 'show'], [auth, Authorize.to('users.view', 'users.manage')])
Router.put('/admin/users/:user', [UserController, 'update'], [auth, Authorize.to('users.manage')])
Router.get('/admin/account-roles', [AdminAccountRoleController, 'index'], [auth, Authorize.to('partners.review')])
Router.put('/admin/account-roles/:role', [AdminAccountRoleController, 'update'], [auth, Authorize.to('partners.review')])
// Booking boards. Dates are held while the advertiser pays; the money waits in escrow until the ad is up.
Router.post('/boards/:board/bookings', [BookingController, 'create'], [auth, Authorize.actingAs('advertiser'), limiter(20, 60)])
Router.get('/account/bookings', [BookingController, 'index'], [auth])
Router.get('/account/board-bookings', [BookingController, 'onMyBoards'], [auth])
Router.get('/bookings/:booking', [BookingController, 'show'], [auth])
Router.post('/bookings/:booking/checkout', [BookingController, 'checkout'], [auth, limiter(10, 60)])
Router.post('/bookings/:booking/cancel', [BookingController, 'cancel'], [auth])

// Payments finish on the provider's checkout. The webhook checks each one with the provider.
Router.post('/payments/:reference/verify', [PaymentController, 'verify'], [auth, limiter(30, 60)])
Router.post('/payments/flutterwave/webhook', [PaymentController, 'flutterwave'], [limiter(120, 60)])

Router.get('/admin/bookings', [AdminBookingController, 'index'], [auth, Authorize.to('bookings.view')])
Router.get('/admin/boards', [AdminBoardController, 'index'], [auth, Authorize.to('boards.review')])
Router.get('/admin/boards/:board', [AdminBoardController, 'show'], [auth, Authorize.to('boards.review')])
Router.put('/admin/boards/:board', [AdminBoardController, 'update'], [auth, Authorize.to('boards.review')])
Router.get('/admin/settings', [SettingsController, 'index'], [auth, Authorize.to('settings.manage')])
Router.put('/admin/settings/:group', [SettingsController, 'update'], [auth, Authorize.to('settings.manage')])
Router.get('/admin/roles', [RoleController, 'index'], [auth, Authorize.to('roles.manage', 'users.view', 'users.manage')])
Router.post('/admin/roles', [RoleController, 'create'], [auth, Authorize.to('roles.manage')])
Router.put('/admin/roles/:role', [RoleController, 'update'], [auth, Authorize.to('roles.manage')])
Router.delete('/admin/roles/:role', [RoleController, 'destroy'], [auth, Authorize.to('roles.manage')])
Router.get('/admin/documents', [AdminDocumentController, 'index'], [auth, Authorize.to('pages.manage')])
Router.get('/admin/documents/:document', [AdminDocumentController, 'show'], [auth, Authorize.to('pages.manage')])
Router.post('/admin/documents', [AdminDocumentController, 'create'], [auth, Authorize.to('pages.manage')])
Router.put('/admin/documents/:document', [AdminDocumentController, 'update'], [auth, Authorize.to('pages.manage')])
Router.delete('/admin/documents/:document', [AdminDocumentController, 'destroy'], [auth, Authorize.to('pages.manage')])
