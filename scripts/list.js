#!/usr/bin/env node

const {searchIndexSort, urlNameToName} = require('../app/util.js')
const {readEntries} = require('../app/unzip.js')

const fs = require('fs')
const pify = require('pify')
const yauzl = require('yauzl')
const normForSearch = require('normalize-for-search')

if (process.argv.length !== 3) {
  console.log('Usage: ./scripts/list.js <name>')
  process.exit()
}

const yauzlOpen = pify(yauzl.open.bind(yauzl))

main(process.argv[2])

async function main (name) {
  const dir = 'transform/' + name

  console.log('loading wiki.zip')
  const zipEntries = await loadZipEntries(dir + '/wiki.zip')
  const articles = zipEntries.map(entryToArticle)
  articles.sort(searchIndexSort)

  console.log('creating list-full.json')
  fs.writeFileSync(dir + '/list-full.json', JSON.stringify(articles))

  console.log('creating list-partial.json')
  const topArticleNames = fs.readFileSync('most-viewed/list.txt', 'utf8')
    .split(/\n/g).filter(s => s.length > 0)
  const topArticles = articles.filter(
    a => topArticleNames.includes(a.urlName))
  fs.writeFileSync(dir + '/list-partial.json', JSON.stringify(topArticles))
}

async function loadZipEntries (path) {
  const zipfile = await yauzlOpen(path, {lazyEntries: true})
  const entries = await readEntries(zipfile)
  return entries
}

function entryToArticle (entry) {
  const {
      fileName,
      compressedSize,
      relativeOffsetOfLocalHeader,
      compressionMethod,
      generalPurposeBitFlag
    } = entry

  if (!fileName.startsWith('A/') || !fileName.endsWith('.html')) {
    throw new Error('unexpected filename ' + fileName)
  }

  const urlName = fileName
    .substring('A/'.length, fileName.length - '.html'.length)
  const name = urlNameToName(urlName)
  const searchName = normForSearch(name)

  return {
    urlName,
    name,
    searchName,
    compressedSize,
    relativeOffsetOfLocalHeader,
    compressionMethod,
    generalPurposeBitFlag
  }
}
