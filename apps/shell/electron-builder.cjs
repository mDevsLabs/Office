/**
 * electron-builder configuration (moved out of package.json "build" so the
 * auto-update feed URL can be injected at build time instead of living in
 * the repo).
 *
 * GENOFFICE_UPDATE_URL — public base URL of the update channel (the generic
 * provider prefix that serves latest.yml / latest-mac.yml). Required for
 * release builds; CI provides it as a repository secret. For local release
 * builds put it in apps/shell/electron-builder.env (gitignored) — the
 * electron-builder CLI loads that file automatically.
 *
 * When the variable is unset (forks, PR smoke builds, plain local packaging)
 * the publish config is omitted: electron-builder then bakes no
 * app-update.yml into the app and in-app auto-update stays disabled.
 */

const { existsSync } = require('node:fs')
const { join } = require('node:path')
const rootPkg = require('../../package.json')

const updateUrl = process.env.GENOFFICE_UPDATE_URL

// The gsk CLI tree below is copied verbatim from node_modules, and the
// nested commander path depends on npm's current hoisting layout — fail the
// build with a clear message if an install ever changes it, instead of
// shipping an installer with a broken gsk runtime.
for (const rel of [
  '../../node_modules/@genspark/cli',
  '../../node_modules/@genspark/cli/node_modules/commander',
  '../../node_modules/ws',
]) {
  if (!existsSync(join(__dirname, rel))) {
    throw new Error(
      `electron-builder extraResources source missing: ${rel} (npm hoisting changed?)`,
    )
  }
}

function resolveWinSidecar() {
  const defaultPath = '../sheets/native/xlsx-engine/target/release/xlsx-sidecar.exe'
  const gnuPath = '../sheets/native/xlsx-engine/target/x86_64-pc-windows-gnu/release/xlsx-sidecar.exe'
  if (existsSync(join(__dirname, defaultPath))) return defaultPath
  if (existsSync(join(__dirname, gnuPath))) return gnuPath
  return defaultPath
}

const unixSidecar = '../sheets/native/xlsx-engine/target/release/xlsx-sidecar'

const hasAppleCreds = Boolean(
  process.env.APPLE_KEYCHAIN_PROFILE ||
  (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID)
)
const skipNotarize = process.env.ELECTRON_BUILDER_SKIP_NOTARIZE === 'true' || !hasAppleCreds
const hasSigningIdentity = Boolean(process.env.CSC_LINK || process.env.CSC_NAME)

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.maioffice.app',
  productName: 'mAI Office',
  executableName: 'mai-office',
  electronVersion: '41.7.1',
  extraMetadata: {
    version: rootPkg.version,
  },
  directories: {
    output: 'release',
  },
  files: ['out/**'],
  extraResources: [
    {
      from: 'build/THIRD-PARTY-NOTICES.txt',
      to: 'THIRD-PARTY-NOTICES.txt',
    },
    {
      from: '../../node_modules/electron/dist/LICENSES.chromium.html',
      to: 'LICENSES.chromium.html',
    },
    {
      from: '../docs/out',
      to: 'modules/docs',
    },
    {
      from: '../sheets/out',
      to: 'modules/sheets',
    },
    {
      from: '../slides/out',
      to: 'modules/slides',
    },
    {
      from: '../pdf/out',
      to: 'modules/pdf',
    },
    {
      from: '../../node_modules/@genspark/cli',
      to: 'gsk/node_modules/@genspark/cli',
    },
    {
      from: '../../node_modules/@genspark/cli/node_modules/commander',
      to: 'gsk/node_modules/commander',
    },
    {
      from: '../../node_modules/ws',
      to: 'gsk/node_modules/ws',
    },
  ],
  fileAssociations: [
    {
      ext: 'docx',
      name: 'Word Document',
      role: 'Editor',
    },
    {
      ext: 'xlsx',
      name: 'Excel Workbook',
      role: 'Editor',
    },
    {
      ext: 'pptx',
      name: 'PowerPoint Presentation',
      role: 'Editor',
    },
    {
      ext: 'xls',
      name: 'Excel 97-2003 Workbook',
      role: 'Editor',
    },
    {
      ext: 'csv',
      name: 'CSV Document',
      role: 'Editor',
    },
    {
      ext: 'pdf',
      name: 'PDF Document',
      role: 'Editor',
    },
  ],
  npmRebuild: false,
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
    hardenedRuntime: hasSigningIdentity,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: !skipNotarize,
    identity: hasSigningIdentity ? undefined : null,
    extraResources: [
      {
        from: unixSidecar,
        to: 'native/xlsx-sidecar',
      },
    ],
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    extraResources: [
      {
        from: resolveWinSidecar(),
        to: 'native/xlsx-sidecar.exe',
      },
    ],
  },
  linux: {
    executableName: 'mai-office',
    maintainer: 'mAI <mprojectsofficiel@gmail.com>',
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
      {
        target: 'deb',
        arch: ['x64'],
      },
      {
        target: 'tar.gz',
        arch: ['x64'],
      },
    ],
    category: 'Office',
    extraResources: [
      {
        from: unixSidecar,
        to: 'native/xlsx-sidecar',
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  dmg: {
    sign: hasSigningIdentity,
  },
  ...(skipNotarize ? {} : { afterAllArtifactBuild: 'build/notarize-dmg.js' }),
}

if (updateUrl) {
  config.publish = [
    {
      provider: 'generic',
      url: updateUrl.replace(/\/+$/, ''),
      channel: 'latest',
    },
  ]
}

module.exports = config
