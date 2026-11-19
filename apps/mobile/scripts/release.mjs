import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Turns a release tag (v1.2.3, 1.2.3, v1.2.3-beta.1) into the app's version name and the Google Play
 * tracks it goes to. Each level also goes to every testing track below it.
 */
class ReleaseVersion {
  static LEVELS = ['internal', 'closed', 'open', 'production']

  static SUFFIX_LEVELS = {
    internal: 'internal',
    dev: 'internal',
    alpha: 'closed',
    closed: 'closed',
    beta: 'open',
    open: 'open',
    rc: 'open',
  }

  constructor(tag, prerelease = false) {
    const match = /^v?(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag.trim())

    if (!match) {
      throw new Error(`"${tag}" isn't a release version. Use a tag like v1.2.3, 1.2.3 or v1.2.3-beta.1.`)
    }

    this.name = match[2] ? `${match[1]}-${match[2]}` : match[1]
    this.suffix = match[2]?.split('.')[0].toLowerCase() ?? ''
    this.prerelease = prerelease
  }

  get level () {
    const fromSuffix = ReleaseVersion.SUFFIX_LEVELS[this.suffix]

    if (fromSuffix) return fromSuffix

    return this.prerelease || this.suffix ? 'open' : 'production'
  }

  tracks (names) {
    const top = ReleaseVersion.LEVELS.indexOf(this.level)

    return ReleaseVersion.LEVELS.slice(0, top + 1).reverse().map((level) => names[level])
  }
}

/**
 * Writes the "What's new" text from the app's feat and fix commits since the previous tag,
 * leaving out admin work and changes to the other apps.
 */
class ReleaseNotes {
  static LIMIT = 500

  static SKIPPED_SCOPES = new Set(['admin', 'api', 'web', 'ci', 'deps', 'docs'])

  constructor(tag, appPath = 'apps/mobile') {
    this.tag = tag
    this.appPath = appPath
  }

  get previousTag () {
    try {
      return git('describe', '--tags', '--abbrev=0', `${this.tag}^`)
    } catch {
      return null
    }
  }

  get commits () {
    const range = this.previousTag ? `${this.previousTag}..${this.tag}` : this.tag

    return git('log', '--format=%s', range, '--', this.appPath).split('\n').filter(Boolean)
  }

  get text () {
    const features = []
    let fixes = false

    for (const subject of this.commits) {
      const match = /^(feat|fix)(?:\(([^)]+)\))?!?:\s*(.+?)(?:\s*\(#\d+\))?$/.exec(subject)

      if (!match || ReleaseNotes.SKIPPED_SCOPES.has(match[2]) || /\badmin/i.test(match[3])) continue

      if (match[1] === 'fix') {
        fixes = true
        continue
      }

      features.push(`• ${match[3].charAt(0).toUpperCase()}${match[3].slice(1)}`)
    }

    const closing = fixes || !features.length ? 'Fixes and small improvements.' : ''

    return this.fit([...new Set(features)], closing)
  }

  fit (lines, closing) {
    const kept = []

    for (const line of lines) {
      if ([...kept, line, closing].join('\n').length > ReleaseNotes.LIMIT) break

      kept.push(line)
    }

    return [...kept, closing].filter(Boolean).join('\n')
  }

  write (directory, locale = 'en-US') {
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, `whatsnew-${locale}`), this.text)
  }
}

/**
 * Resolves the version name, build number and Play tracks for a workflow run and hands them to the
 * next steps through GITHUB_OUTPUT. Runs that aren't releases keep app.json's version.
 */
class MobileRelease {
  constructor(env = process.env) {
    this.env = env
    this.pkg = JSON.parse(readFileSync(join(APP_DIR, 'package.json'), 'utf8'))
    this.app = JSON.parse(readFileSync(join(APP_DIR, 'app.json'), 'utf8')).expo
    this.tag = env.RELEASE_TAG || ''
    this.version = this.tag ? new ReleaseVersion(this.tag, env.RELEASE_PRERELEASE === 'true') : null
  }

  get buildNumber () {
    const base = Number(this.pkg.baseBuildNumber ?? 0)
    const run = Number(this.env.GITHUB_RUN_NUMBER ?? 0)

    return base + run
  }

  get trackNames () {
    return {
      internal: 'internal',
      closed: this.env.PLAY_CLOSED_TRACK || 'alpha',
      open: 'beta',
      production: 'production',
    }
  }

  get outputs () {
    const outputs = {
      version: this.version?.name ?? this.app.version,
      'build-number': String(this.buildNumber),
      package: this.app.android.package,
    }

    if (this.version) {
      outputs.level = this.version.level
      outputs.tracks = this.version.tracks(this.trackNames).join(',')
    }

    return outputs
  }

  run () {
    const outputs = this.outputs
    const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`)

    if (this.version && this.env.WHATS_NEW_DIR) {
      new ReleaseNotes(this.tag).write(this.env.WHATS_NEW_DIR)
    }

    if (this.env.GITHUB_OUTPUT) appendFileSync(this.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)

    console.log(lines.join('\n'))
  }
}

function git (...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

try {
  new MobileRelease().run()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
