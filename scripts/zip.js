#!/usr/bin/env node
/* eslint-env node */
/* global process:readonly */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const pkgPath = path.join(root, 'package.json')
const manifestPath = path.join(root, 'manifest.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const name = (pkg.name || 'extension').replace(/[^a-z0-9-_]/gi, '-')
const version = manifest.version || pkg.version || '0.0.0'
const outDir = path.join(root, 'dist')

fs.mkdirSync(outDir, { recursive: true })

const zipName = `${name}-v${version}.zip`
const zipPath = path.join(outDir, zipName)

if (fs.existsSync(zipPath)){
	fs.rmSync(zipPath)
}

const includeList = [
	'manifest.json',
	'icons',
	'src',
	'config',
]

const excludeGlobs = [
	'node_modules/*',
	'.git/*',
	'dist/*',
	'*.zip',
	'.DS_Store',
	'**/.DS_Store',
	'README.md',
	'LICENSE',
	'eslint.config.js',
	'commitlint.config.js',
	'permission.sh',
]

const includeArgs = includeList.map(p=> `'${p}'`).join(' ')
const excludeArgs = excludeGlobs.map(g=> `-x '${g}'`).join(' ')

const cmd = `cd '${root}' && zip -r '${zipPath}' ${includeArgs} ${excludeArgs}`

try{
	execSync(cmd, { stdio: 'inherit', shell: '/bin/zsh' })
	console.log(`\nCreated: ${zipPath}`)
} catch(err){
	console.error('Failed to create zip:', err.message)
	process.exitCode = 1
}
