const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const courseDir = path.join(__dirname, '..', 'courses', 'crypto-101')
const outZip = path.join(__dirname, '..', 'courses', 'crypto-101.zip')

if (!fs.existsSync(courseDir)) {
  console.error('Course directory not found:', courseDir)
  process.exit(1)
}

const zip = new AdmZip()
zip.addLocalFolder(courseDir)
zip.writeZip(outZip)
console.log('Created:', outZip)
