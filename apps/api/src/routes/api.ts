import AccountController from 'src/app/http/controllers/AccountController'
import AccountRoleController from 'src/app/http/controllers/AccountRoleController'
import AccountBoardController from 'src/app/http/controllers/AccountBoardController'
import AgreementController from 'src/app/http/controllers/AgreementController'
import AuthController from 'src/app/http/controllers/AuthController'
import BoardController from 'src/app/http/controllers/BoardController'
import AuctionController from 'src/app/http/controllers/AuctionController'
import ShareController from 'src/app/http/controllers/ShareController'
import MessageController from 'src/app/http/controllers/MessageController'
import OfferController from 'src/app/http/controllers/OfferController'
import BookingController from 'src/app/http/controllers/BookingController'
import PaymentController from 'src/app/http/controllers/PaymentController'
import PrintJobController from 'src/app/http/controllers/PrintJobController'
import ProofController from 'src/app/http/controllers/ProofController'
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
import AdminPayoutController from 'src/app/http/controllers/admin/PayoutController'
import PayoutController from 'src/app/http/controllers/PayoutController'
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
Router.get('/account/partner-checks', [AccountRoleController, 'checks'], [auth])
Router.post('/account/identity', [AccountRoleController, 'submitIdentity'], [auth, limiter(10, 60)])

// Boards: listed ones on the map for everyone, and the ones scouts and owners tag
Router.get('/board-kinds', [BoardController, 'kinds'], [limiter(120, 60)])
Router.get('/boards', [BoardController, 'index'], [limiter(240, 60)])
Router.get('/boards/pins', [BoardController, 'pins'], [limiter(240, 60)])
Router.get('/boards/:board', [BoardController, 'show'], [limiter(240, 60)])
Router.get('/boards/:board/availability', [BookingController, 'availability'], [limiter(120, 60)])
Router.get('/account/boards', [AccountBoardController, 'index'], [auth])
Router.get('/account/boards/nearby', [AccountBoardController, 'nearby'], [auth, Authorize.actingAs('owner', 'scout'), limiter(60, 60)])
Router.post('/account/boards', [AccountBoardController, 'create'], [auth, Authorize.actingAs('owner', 'scout'), limiter(30, 60)])
Router.put('/account/boards/:board', [AccountBoardController, 'update'], [auth])
Router.delete('/account/boards/:board', [AccountBoardController, 'destroy'], [auth])
Router.post('/account/boards/:board/photos', [AccountBoardController, 'addPhoto'], [auth, limiter(60, 60)])
Router.delete('/account/boards/:board/photos/:photo', [AccountBoardController, 'removePhoto'], [auth])
Router.put('/account/boards/:board/faces/:face', [AccountBoardController, 'updateFace'], [auth])
Router.post('/account/boards/:board/blocks', [AccountBoardController, 'block'], [auth, limiter(60, 60)])
Router.delete('/account/boards/:board/blocks/:block', [AccountBoardController, 'unblock'], [auth])
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
Router.put('/admin/account-roles/:role/identity', [AdminAccountRoleController, 'reviewIdentity'], [auth, Authorize.to('partners.review')])
// Booking boards. Dates are held while the advertiser pays; the money waits in escrow until the ad is up.
Router.post('/boards/:board/bookings', [BookingController, 'create'], [auth, Authorize.actingAs('advertiser'), limiter(20, 60)])
Router.get('/account/bookings', [BookingController, 'index'], [auth])
Router.get('/account/board-bookings', [BookingController, 'onMyBoards'], [auth])
Router.get('/bookings/:booking', [BookingController, 'show'], [auth])
Router.post('/bookings/:booking/checkout', [BookingController, 'checkout'], [auth, limiter(10, 60)])
Router.post('/bookings/:booking/cancel', [BookingController, 'cancel'], [auth])
Router.post('/bookings/:booking/artwork', [BookingController, 'uploadArtwork'], [auth, limiter(20, 60)])
Router.post('/bookings/:booking/artwork/review', [BookingController, 'reviewArtwork'], [auth])

// Bids and offers. A won bid or accepted offer becomes a booking held while the advertiser pays.
Router.get('/boards/:board/auctions', [AuctionController, 'index'], [limiter(120, 60)])
Router.get('/auctions/:auction', [AuctionController, 'show'], [limiter(240, 60)])
Router.post('/account/boards/:board/auctions', [AuctionController, 'create'], [auth, limiter(20, 60)])
Router.post('/auctions/:auction/bids', [AuctionController, 'bid'], [auth, Authorize.actingAs('advertiser'), limiter(30, 60)])
Router.post('/auctions/:auction/cancel', [AuctionController, 'cancel'], [auth])
Router.get('/account/bids', [AuctionController, 'mine'], [auth])
Router.post('/boards/:board/offers', [OfferController, 'create'], [auth, Authorize.actingAs('advertiser'), limiter(20, 60)])
Router.get('/account/offers', [OfferController, 'index'], [auth])
Router.get('/account/board-offers', [OfferController, 'onMyBoards'], [auth])
Router.post('/offers/:offer/accept', [OfferController, 'accept'], [auth, limiter(20, 60)])
Router.post('/offers/:offer/decline', [OfferController, 'decline'], [auth])
Router.post('/offers/:offer/counter', [OfferController, 'counter'], [auth, limiter(20, 60)])
Router.post('/offers/:offer/withdraw', [OfferController, 'withdraw'], [auth])

// Shared bookings: others join from the organiser's invite link and pay their own share.
Router.get('/shares/:token', [ShareController, 'show'], [auth, limiter(60, 60)])
Router.post('/shares/:token/claim', [ShareController, 'claim'], [auth, Authorize.actingAs('advertiser'), limiter(20, 60)])
Router.post('/bookings/:booking/shares/cover', [ShareController, 'cover'], [auth, limiter(10, 60)])

// Messages about a booking, kept with it. Managed owners get them by SMS.
Router.get('/bookings/:booking/messages', [MessageController, 'index'], [auth, limiter(240, 60)])
Router.post('/bookings/:booking/messages', [MessageController, 'store'], [auth, limiter(30, 60)])

// Proof the ad is up: geotagged photos from the billposter, checked by the advertiser, release the money.
Router.post('/bookings/:booking/proofs', [ProofController, 'store'], [auth, limiter(30, 60)])
Router.delete('/bookings/:booking/proofs/:proof', [ProofController, 'destroy'], [auth])
Router.post('/bookings/:booking/proof/submit', [ProofController, 'submit'], [auth])
Router.post('/bookings/:booking/proof/accept', [ProofController, 'accept'], [auth])
Router.post('/bookings/:booking/proof/dispute', [ProofController, 'dispute'], [auth])

// Billposters print approved artwork and put it up. A reserved job is theirs alone for a few hours.
Router.get('/print-jobs', [PrintJobController, 'index'], [auth, Authorize.actingAs('billposter'), limiter(120, 60)])
Router.get('/account/print-jobs', [PrintJobController, 'mine'], [auth, Authorize.actingAs('billposter')])
Router.get('/print-jobs/:job', [PrintJobController, 'show'], [auth, Authorize.actingAs('billposter')])
Router.post('/print-jobs/:job/reserve', [PrintJobController, 'reserve'], [auth, Authorize.actingAs('billposter'), limiter(30, 60)])
Router.post('/print-jobs/:job/confirm', [PrintJobController, 'confirm'], [auth, Authorize.actingAs('billposter')])
Router.post('/print-jobs/:job/release', [PrintJobController, 'release'], [auth, Authorize.actingAs('billposter')])
Router.post('/print-jobs/:job/print-photo', [PrintJobController, 'printPhoto'], [auth, Authorize.actingAs('billposter'), limiter(20, 60)])

// Payments finish on the provider's checkout. The webhook checks each one with the provider.
Router.post('/payments/:reference/verify', [PaymentController, 'verify'], [auth, limiter(30, 60)])
Router.post('/payments/flutterwave/webhook', [PaymentController, 'flutterwave'], [limiter(120, 60)])

Router.get('/admin/bookings', [AdminBookingController, 'index'], [auth, Authorize.to('bookings.view')])
Router.post('/admin/bookings/:booking/refund', [AdminBookingController, 'refund'], [auth, Authorize.to('payouts.manage'), limiter(30, 60)])
Router.get('/admin/payouts', [AdminPayoutController, 'index'], [auth, Authorize.to('payouts.manage')])
Router.post('/admin/payouts/:payout/retry', [AdminPayoutController, 'retry'], [auth, Authorize.to('payouts.manage'), limiter(30, 60)])

// Where owners, scouts and billposters are paid, and what they've been sent.
Router.get('/banks', [PayoutController, 'banks'], [auth, limiter(30, 60)])
Router.get('/account/payouts', [PayoutController, 'show'], [auth])
Router.get('/account/payouts/history', [PayoutController, 'history'], [auth])
Router.put('/account/payout-account', [PayoutController, 'save'], [auth, limiter(10, 60)])
Router.put('/account/owner-profiles/:profile/payout-account', [PayoutController, 'saveForOwner'], [auth, limiter(10, 60)])
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
