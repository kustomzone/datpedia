const normalizeForSearch = require('normalize-for-search')
const binarySearchBounds = require('binary-search-bounds')

const {searchIndexSort} = require('./util.js')

module.exports = {findItem, findRange}

function findItem (searchIndex, name) {
  const searchName = normalizeForSearch(name)
  const ix = binarySearchBounds.eq(searchIndex, {searchName}, searchIndexSort)
  return ix < 0 ? null : searchIndex[ix]
}

function findRange (searchIndex, prefix) {
  const searchPrefix = normalizeForSearch(prefix)

  // create items for binary search
  const startItem = { searchName: searchPrefix }
  const endItem = { searchName: searchPrefix + String.fromCharCode(0xffff) }

  const matchedItems = searchIndex.slice(
    binarySearchBounds.ge(searchIndex, startItem, searchIndexSort),
    binarySearchBounds.lt(searchIndex, endItem, searchIndexSort) + 1
  )

  return matchedItems
}
