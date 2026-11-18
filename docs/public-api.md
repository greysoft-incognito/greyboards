# Greyboards public API

Agencies and advertisers can search boards, check free dates, hold dates and start payment from their own tools. Every call acts as the account that made the key.

## Keys

Make a key in **Settings → API keys** on the web app. A key can:

- **read**: search boards, see a board and its free dates, and see the account's bookings;
- **read and book**: also hold dates and start or cancel payment.

The full key (`gbk_…`) shows once, when it's made. After that only its first ten characters show, so you can tell keys apart. Remove a key to stop it working straight away.

Send it on every call:

```
Authorization: Bearer gbk_…
Accept: application/json
```

A signed-in token from the apps does not work here, and an API key does not work on the apps' routes.

## Limits

Admins set these in **Admin → Settings → Public API**:

| Setting | Default | Effect |
| --- | --- | --- |
| `enabled` | on | Off answers every call with `503`. |
| `max_keys` | 5 | Live keys one account may hold. |
| `requests_per_minute` | 120 | Calls one key may make each minute; the rest get `429`. |

## Endpoints

All paths start with `/api/v1`.

| Method | Path | Key needs | What it does |
| --- | --- | --- | --- |
| GET | `/me` | read | The account the key belongs to. |
| GET | `/boards` | read | Listed boards, a page at a time. Filter with `kind`, `lit`, `maxRateMinor`; near a point with `lat`, `lng`, `radiusKm`; or inside `west`, `south`, `east`, `north`. `page` and `perPage` (up to 100). |
| GET | `/boards/{id}` | read | One board, with its rate card, booking terms and traffic. |
| GET | `/boards/{id}/availability` | read | Days already taken on each face. |
| POST | `/boards/{id}/bookings` | book | Hold dates. Body: `startsOn` (`YYYY-MM-DD`), `periods`, and optionally `faceId` and `shares`. The account needs the advertiser role. |
| GET | `/bookings` | read | The account's bookings. |
| GET | `/bookings/{id}` | read | One booking. |
| POST | `/bookings/{id}/checkout` | book | Start payment. Returns `checkoutUrl` to send the payer to. |
| POST | `/bookings/{id}/cancel` | book | Cancel a held or booked run, under the usual cancellation rules. |

Amounts are in minor units (kobo), as integers.

## Responses

Every response is JSON in the same shape as the apps use:

```json
{ "data": { … }, "status": "success", "message": "OK", "code": 200 }
```

Lists that page also carry `meta` with `current_page`, `per_page`, `total` and `last_page`.

Errors carry `status: "error"`, a `message` a person can read, and for a bad body, `errors` by field:

| Code | Meaning |
| --- | --- |
| 401 | Missing, unknown or removed key. |
| 403 | The key can't do this (for example a read key booking), or the account is suspended. |
| 422 | The body didn't pass checks, or the dates aren't free. |
| 429 | Over the key's limit for this minute. |
| 503 | The public API is switched off. |
