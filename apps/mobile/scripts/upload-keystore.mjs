import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Creates the Android upload keystore that signs App Bundles for Google Play, and writes the values
 * for the GitHub secrets next to it in apps/mobile/credentials (which git ignores).
 */
class UploadKeystore {
  constructor(directory, alias = 'upload') {
    this.directory = directory
    this.alias = alias
    this.file = join(directory, 'upload-keystore.jks')
    this.password = randomBytes(24).toString('base64url')
  }

  create() {
    if (existsSync(this.file)) {
      throw new Error(`${this.file} already exists. Move it aside first: Google Play only accepts the key it was first given.`)
    }

    mkdirSync(this.directory, { recursive: true })

    execFileSync('keytool', [
      '-genkeypair',
      '-storetype', 'PKCS12',
      '-keystore', this.file,
      '-alias', this.alias,
      '-keyalg', 'RSA',
      '-keysize', '4096',
      '-validity', '10000',
      '-storepass', this.password,
      '-keypass', this.password,
      '-dname', 'CN=Greyboards, O=Greysoft',
    ], { stdio: 'inherit' })

    const secrets = {
      ANDROID_KEYSTORE_BASE64: readFileSync(this.file).toString('base64'),
      ANDROID_KEYSTORE_PASSWORD: this.password,
      ANDROID_KEY_ALIAS: this.alias,
      ANDROID_KEY_PASSWORD: this.password,
    }

    const lines = Object.entries(secrets).map(([name, value]) => `${name}=${value}`)

    writeFileSync(join(this.directory, 'github-secrets.env'), `${lines.join('\n')}\n`, { mode: 0o600 })

    return secrets
  }
}

const directory = fileURLToPath(new URL('../credentials', import.meta.url))

try {
  new UploadKeystore(directory).create()

  console.log(`
Created ${join(directory, 'upload-keystore.jks')}.
Add each line of ${join(directory, 'github-secrets.env')} as a secret in the play-store environment,
then keep both files somewhere safe, such as a password manager. Without them, Play can't take new uploads.`)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
