import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const pkgPath = path.join(root, 'package.json')
const manifestPath = path.join(root, 'manifest.json')

const readJson = filePath=> JSON.parse(fs.readFileSync(filePath, 'utf8'))

const writeJson = (filePath, obj)=> {
	const content = JSON.stringify(obj, null, 4) + '\n'
	fs.writeFileSync(filePath, content, 'utf8')
}

const syncVersion = ()=> {
	if (!fs.existsSync(pkgPath)){
		throw new Error('package.json not found at ' + pkgPath)
	}
	if (!fs.existsSync(manifestPath)){
		throw new Error('manifest.json not found at ' + manifestPath)
	}

	const pkg = readJson(pkgPath)
	const manifest = readJson(manifestPath)

	const pkgVersion = String(pkg.version || '').trim()
	if (!pkgVersion){
		throw new Error('No version field found in package.json')
	}

	if (manifest.version === pkgVersion){
		console.log('manifest version already up-to-date:', pkgVersion)
		return
	}

	manifest.version = pkgVersion
	writeJson(manifestPath, manifest)

	console.log(`Updated manifest.json version -> ${pkgVersion}`)
}

try{
	syncVersion()
}catch(err){
	console.error('Error syncing manifest version:', err && err.message ? err.message : err)
	throw err
}
