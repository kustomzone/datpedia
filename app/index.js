const React = require('react')
const ReactDOM = require('react-dom')
const webworkify = require('webworkify')
const { Comlink } = require('comlinkjs')

const App = require('./App.js')
const {openZip, getFile} = require('./unzip.js')
const {urlNameToName} = require('./util.js')
const {findItem} = require('./search.js')

const SEARCH_INDEX_PATHS = {
  partial: '/list-partial.json',
  full: '/list-full.json'
}

const worker = Comlink.proxy(webworkify(require('./worker.js')))
const zipFilePromise = openZip('/wiki.zip')

const store = window.store = {
  urlName: null, // null for the home page, or eg "Star_Wars" for that article
  citeNote: null,
  searchIndexes: {
    partial: [], // list of *top* articles, search normalized and sorted
    full: [], // list of *all* articles, search normalized and sorted
    partialPromise: null,
    fullPromise: null
  },
  articleCache: {}, // article HTML cache, eg "Star_Wars": "<html>..."
  search: null // current search, eg "sta", or null
}

init()

async function init () {
  if (!window.DatArchive) {
    console.log('old web, not loading dat...')
  } else {
    // initDat()
  }

  window.addEventListener('hashchange', routeAndRender)
  routeAndRender()

  await initSearchIndex('partial')
  await initSearchIndex('full')
}

/*
function initDat () {
  // Get the url of the current archive
  const datUrl = window.location.origin

  const archive = new window.DatArchive(datUrl)

  // Listen to network events, for debugging purposes...
  const networkActivity = archive.createNetworkActivityStream()

  networkActivity.addEventListener('network-changed', ({connections}) => {
    console.log(connections, 'current peers')
  })
  networkActivity.addEventListener('download', ({feed, block, bytes}) => {
    console.log('downloaded a block in the', feed, {block, bytes})
  })
  networkActivity.addEventListener('upload', ({feed, block, bytes}) => {
    console.log('uploaded a block in the', feed, {block, bytes})
  })
  networkActivity.addEventListener('sync', ({feed}) => {
    console.log('downloaded everything currently published in the', feed)
  })
}
*/

/**
 * TODO: maybe use ServiceWorker once Beaker allows it
 * See: https://github.com/beakerbrowser/beaker/issues/46
 *
 * async function registerServiceWorker () {
 *   if (!navigator.serviceWorker) throw new Error('No service worker support')
 *   return navigator.serviceWorker.register(
 *     '/sw-bundle.js',
 *     { scope: '/' }
 *   )
 * }
 */

/**
 * Either starts fetching a given search index,
 * or returns the promise for a fetch already done or already in progress.
 * (Returns a promise no matter what.)
 */
function initSearchIndex (indexName) {
  let promise = store.searchIndexes[indexName + 'Promise']

  if (promise == null) {
    // Start the fetch
    promise = fetchSearchIndex(indexName)
    store.searchIndexes[indexName + 'Promise'] = promise
  }

  return promise
}

async function fetchSearchIndex (indexName) {
  const indexPath = SEARCH_INDEX_PATHS[indexName]
  const url = window.location.origin + indexPath
  const searchIndex = await worker.fetchSearchIndex(url)

  store.searchIndexes[indexName] = searchIndex
  console.log(
    'loaded search index %s, %d entries',
    indexName,
    searchIndex.length
  )

  return searchIndex
}

function render () {
  const root = document.querySelector('#root')
  const app = <App store={store} dispatch={dispatch} />
  ReactDOM.render(app, root)
}

function maybeScrollToCiteNote () {
  const { citeNote } = store

  // If no citation currently selected, do nothing
  if (store.citeNote == null) return

  const $citeNote = document.getElementById(citeNote)

  // If no matching citation found, early return
  if ($citeNote == null) return

  // Clear the cite note so we don't scroll to it again if render() is called
  // multiple times
  store.citeNote = null

  // Smoothly scroll to the citation location on page
  $citeNote.scrollIntoView({
    block: 'start',
    inline: 'nearest'
  })
}

function dispatch (action, data) {
  console.log('dispatch', action, data)
  switch (action) {
    case 'NAVIGATE':
      store.search = null
      window.location = data
      return
    case 'SET_SEARCH':
      store.search = data
      render()
      return
    default:
      throw new Error('unknown action ' + action)
  }
}

function routeAndRender () {
  // Route
  const {hash} = window.location
  const parts = hash.split('#')
  store.urlName = parts[1] || null
  store.citeNote = parts[2] || null

  console.log('routing', store.urlName)

  // Start loading the article asynchronously
  if (store.urlName != null) loadArticle(store.urlName)

  // Render immediately
  render()
  maybeScrollToCiteNote()
}

async function loadArticle (urlName) {
  if (store.articleCache[urlName] != null) {
    return
  }

  console.log(`loading article ${urlName}`)

  const zipFile = await zipFilePromise

  const entryData = await getEntryData(urlName)
  if (entryData == null) {
    throw new Error('entry not found: ' + urlName)
  }

  const html = await getFile(zipFile, entryData)

  console.log(`loaded article ${urlName}, got ${html && html.length} b`)
  store.articleCache[urlName] = html

  render()
}

async function getEntryData (urlName) {
  // TODO: IndexedDB

  // First, find the search name
  const name = urlNameToName(urlName)

  // First, check the partial index
  const partial = await initSearchIndex('partial')
  let entryData = findItem(partial, name)
  if (entryData == null) {
    // Then, check the full index
    const full = await initSearchIndex('full')
    entryData = findItem(full, name)
  }

  return entryData
}
