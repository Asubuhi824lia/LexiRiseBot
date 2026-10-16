import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(here, '..')
const repoRoot = path.resolve(serverRoot, '..')
const locationFile = path.join(serverRoot, 'db-location.json')
const legacyDataDir = path.join(serverRoot, 'data')

type LocationFile = {
  dataDir: string
}

function readProjectName() {
  const raw = readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
  const name = (JSON.parse(raw) as { name?: string }).name?.trim() || 'app'
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'app'
  return safe
}

export const PROJECT_DB_FOLDER = `${readProjectName()}_DB`

function readSavedLocation(): string | null {
  if (!existsSync(locationFile)) return null
  try {
    const parsed = JSON.parse(readFileSync(locationFile, 'utf8')) as LocationFile
    if (typeof parsed.dataDir === 'string' && parsed.dataDir.trim()) {
      return path.resolve(parsed.dataDir.trim())
    }
  } catch {
    // повреждённый файл — запросим путь заново
  }
  return null
}

function saveLocation(dataDir: string) {
  const payload: LocationFile = { dataDir }
  writeFileSync(locationFile, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })
}

function assertUsableDir(dir: string) {
  mkdirSync(dir, { recursive: true })
  accessSync(dir, constants.R_OK | constants.W_OK)
}

function dataDirFromParent(parentDir: string) {
  return path.join(path.resolve(parentDir), PROJECT_DB_FOLDER)
}

async function promptParentDir(): Promise<string> {
  if (!input.isTTY) {
    throw new Error(
      `Первый запуск: укажите директорию для БД через DB_PARENT_DIR или DATA_DIR ` +
        `(будет использована папка ${PROJECT_DB_FOLDER}). ` +
        `Либо запустите сервер в интерактивном терминале: npm run dev:server`,
    )
  }

  const rl = createInterface({ input, output })
  try {
    for (;;) {
      const answer = (
        await rl.question(
          `Укажите директорию для хранения базы данных\n` +
            `(в ней будет создана папка ${PROJECT_DB_FOLDER}): `,
        )
      ).trim()

      if (!answer) {
        console.error('Путь не должен быть пустым.')
        continue
      }

      const parentDir = path.resolve(answer)
      try {
        assertUsableDir(parentDir)
        return parentDir
      } catch {
        console.error(`Не удалось использовать директорию: ${parentDir}`)
      }
    }
  } finally {
    rl.close()
  }
}

/** Резолвит каталог данных приложения (…/<project>_DB) при первом запуске с запросом пути. */
export async function resolveDataDir(): Promise<string> {
  const fromEnvDataDir = process.env.DATA_DIR?.trim()
  if (fromEnvDataDir) {
    const dataDir = path.resolve(fromEnvDataDir)
    assertUsableDir(dataDir)
    return dataDir
  }

  const fromEnvParent = process.env.DB_PARENT_DIR?.trim()
  if (fromEnvParent) {
    const dataDir = dataDirFromParent(fromEnvParent)
    assertUsableDir(dataDir)
    saveLocation(dataDir)
    return dataDir
  }

  const saved = readSavedLocation()
  if (saved) {
    assertUsableDir(saved)
    return saved
  }

  if (existsSync(path.join(legacyDataDir, 'users.db'))) {
    assertUsableDir(legacyDataDir)
    saveLocation(legacyDataDir)
    return legacyDataDir
  }

  const parentDir = await promptParentDir()
  const dataDir = dataDirFromParent(parentDir)
  assertUsableDir(dataDir)
  saveLocation(dataDir)
  console.info(`Каталог базы данных: ${dataDir}`)
  return dataDir
}
