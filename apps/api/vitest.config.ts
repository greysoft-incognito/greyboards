import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (path = '') => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^@app\//, replacement: src('app/') },
      { find: /^@core\//, replacement: src('core/') },
      { find: /^@controllers\//, replacement: src('app/http/controllers/') },
      { find: /^@models\//, replacement: src('app/models/') },
      { find: /^src\//, replacement: src() },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    env: {
      NODE_ENV: 'test',
      VERBOSITY: '0',
      MAIL_TRANSPORT: 'file',
      PAYMENT_DRIVER: 'fake',
    },
  },
})
