import { readdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const lexiconDir = join(root, 'src', 'lexicon')
const generatedIndex = join(root, 'src', 'generated', 'index.ts')

const entries = await readdir(lexiconDir, { withFileTypes: true })
const lexiconFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => join(lexiconDir, entry.name))

if (lexiconFiles.length === 0) {
  throw new Error('No lexicon files found in src/lexicon.')
}

await runLexCli([
  'gen-api',
  '--yes',
  'src/generated',
  ...lexiconFiles,
])

await rm(generatedIndex, { force: true })

function runLexCli(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const lexCliEntrypoint = join(
      root,
      'node_modules',
      '@atproto',
      'lex-cli',
      'dist',
      'index.js',
    )
    const child = spawn(process.execPath, [lexCliEntrypoint, ...args], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      rejectPromise(new Error(`lex exited with code ${code}`))
    })
  })
}
