import ActivityState from './activity-state'
import QuickStorage from './quick-storage'
import Scheme from './scheme'
import {findIndex} from './utilities'

/**
 * Check if LocalStorage is supported in the current browser
 *
 * @param {boolean=} toThrow
 * @returns {boolean}
 */
function isSupported (toThrow) {

  let uid = (new Date).toString()
  let storage
  let result

  try {
    (storage = window.localStorage).setItem(uid, uid)
    result = storage.getItem(uid) === uid
    storage.removeItem(uid)
    return !!(result && storage)
  } catch (exception) {
    if (toThrow) {
      throw Error('LocalStorage is not supported in this browser')
    } else {
      return false
    }
  }

}

/**
 * Prepare schema details if not existent
 *
 * @private
 */
function _open () {

  isSupported(true)

  const stores = Object.keys(Scheme)

  stores.forEach(storeName => {
    if (storeName === 'activityState' && !QuickStorage.activityState) {
      QuickStorage.activityState = ActivityState.current ? [ActivityState.current] : []
    } else if (!QuickStorage[storeName]) {
      QuickStorage[storeName] = []
    }
  })
}

/**
 * Initiate quasi-database request
 *
 * @param {string} storeName
 * @param {*=} id
 * @param {Object=} item
 * @param {Function} action
 * @returns {Promise}
 * @private
 */
function _initRequest ({storeName, id, item}, action) {

  _open()

  return new Promise((resolve, reject) => {

    const items = QuickStorage[storeName]
    const keyPath = Scheme[storeName].options.keyPath
    const keys = keyPath instanceof Array ? keyPath.slice() : [keyPath]

    if (id) {
      const ids = id instanceof Array ? id.slice() : [id]
      item = keys.reduce((acc, key, index) => {
        acc[key] = ids[index]
        return acc
      }, {})
    }

    const index = item ? findIndex(items, keys, item) : null

    return action(resolve, reject, {keys, items, item, index})
  })
}

/**
 * Sort the array by provided key (key can be a composite one)
 *
 * @param {array} items
 * @param {string|array} key
 * @returns {array}
 * @private
 */
function _sort (items, key) {

  const keys = (key instanceof Array ? key : [key]).slice().reverse()

  function compare (a, b, key) {
    if (a[key] < b[key]) {
      return -1
    } else if (a[key] > b[key]) {
      return 1
    } else {
      return 0
    }
  }

  return items.sort((a, b) => {
    return keys.reduce((acc, key) => {
      return acc || compare(a, b, key)
    }, 0)
  })
}

/**
 * Get all records from particular store
 *
 * @param {string} storeName
 * @param {boolean=} firstOnly
 * @returns {Promise}
 */
function getAll (storeName, firstOnly) {

  _open()

  return new Promise((resolve, reject) => {

    const value = QuickStorage[storeName]

    if (value instanceof Array) {
      resolve(firstOnly ? value[0] : _sort(value, Scheme[storeName].options.keyPath))
    } else {
      reject({name: 'NotFoundError', message: `No store named ${storeName} in this storage`})
    }
  })
}

/**
 * Get the first row from the store
 *
 * @param {string} storeName
 * @returns {Promise}
 */
function getFirst (storeName) {
  return getAll(storeName, true)
}

/**
 * Print key value pairs to be used in error trace message
 *
 * @param {Array} keys
 * @param {Object} item
 * @returns {string}
 * @private
 */
function _keyValuePairs (keys, item) {
  return keys.join(':') + ' => ' + keys.map((key) => {
    return item[key]
  }).join(':')
}

/**
 * Get item from a particular store
 *
 * @param {string} storeName
 * @param {*} id
 * @returns {Promise}
 */
function getItem (storeName, id) {
  return _initRequest({storeName, id}, (resolve, reject, {keys, items, item, index}) => {
    if (index === -1) {
      reject({name: 'NotFoundError', message: `No record found ${_keyValuePairs(keys, item)} in ${storeName} store`})
    } else {
      resolve(items[index])
    }
  })
}

/**
 * Return filtered result by value on available index
 *
 * @param {string} storeName
 * @param {string} by
 * @returns {Promise}
 */
function filterBy (storeName, by) {
  return getAll(storeName)
    .then(result => {
      return result.filter(item => {
        return item[Scheme[storeName].index] === by
      })
    })
}

/**
 * Return values for primary keys of particular item
 *
 * @param {Array} keys
 * @param {Object} item
 * @returns {*}
 * @private
 */
function _return (keys, item) {
  return keys.length === 1 ? item[keys[0]] : keys.map((key) => item[key])
}

/**
 * Add item to a particular store
 *
 * @param {string} storeName
 * @param {Object} item
 * @returns {Promise}
 */
function addItem (storeName, item) {
  return _initRequest({storeName, item}, (resolve, reject, {keys, items, index}) => {
    if (index !== -1) {
      reject({name: 'ConstraintError', message: `Item ${_keyValuePairs(keys, item)} already exists`})
    } else {
      items.push(item)
      QuickStorage[storeName] = items
      resolve(_return(keys, item))
    }
  })
}

/**
 * Add multiple items into particular store
 *
 * @param {string} storeName
 * @param {Object} target
 * @param {boolean=} overwrite
 * @returns {Promise}
 */
function addBulk (storeName, target, overwrite) {
  return _initRequest({storeName}, (resolve, reject, {keys, items}) => {

    if (!target || target && !target.length) {
      return reject({name: 'NoTargetDefined', message: `No array provided to perform add bulk operation into ${storeName} store`})
    }

    let existing = []

    target.forEach(item => {
      const index = findIndex(items, keys, item)
      if (index !== -1) {
        existing.push({target: item, index})
      }
    })

    if (overwrite) {
      const indexes = existing.map(i => i.index).sort((a, b) => { return b - a })
      indexes.forEach(index => items.splice(index, 1))
    }

    if (existing.length && !overwrite) {
      reject({name: 'ConstraintError', message: `Items with ${keys.join(':')} => ${existing.map(i => keys.map(k => i.target[k]).join(':')).join(',')} already exist`})
    } else {
      QuickStorage[storeName] = _sort([...items, ...target], keys)
      resolve(target.map((item) => keys.map(k => item[k])))
    }
  })
}

/**
 * Update item in a particular store
 *
 * @param {string} storeName
 * @param {Object} item
 * @returns {Promise}
 */
function updateItem (storeName, item) {
  return _initRequest({storeName, item}, (resolve, _, {keys, items, index}) => {
    if (index === -1) {
      items.push(item)
    } else {
      items.splice(index, 1, item)
    }

    QuickStorage[storeName] = items
    resolve(_return(keys, item))
  })
}

/**
 * Delete item from a particular store
 *
 * @param {string} storeName
 * @param {*} id
 * @returns {Promise}
 */
function deleteItem (storeName, id) {
  return _initRequest({storeName, id}, (resolve, _, {items, index}) => {
    if (index !== -1) {
      items.splice(index, 1)
      QuickStorage[storeName] = items
    }

    resolve(id)
  })
}

/**
 * Find index of the item with the closest value to the bound
 *
 * @param {Array} array
 * @param {string} key
 * @param {number} bound
 * @returns {number}
 * @private
 */
function _findMax (array, key, bound) {

  if (!array.length) {
    return -1
  }

  let max = {index: -1, value: 0}

  for (let i = 0; i < array.length; i += 1) {
    if (array[i][key] <= bound) {
      if (array[i][key] > max.value) {
        max = {value: array[i][key], index: i}
      }
    } else {
      return max.index
    }
  }
}

/**
 * Delete items until certain bound (primary key as a bound scope)
 *
 * @param {string} storeName
 * @param {*} upperBound
 * @returns {Promise}
 */
function deleteBulk (storeName, upperBound) {
  return getAll(storeName)
    .then(items => {

      const key = Scheme[storeName].options.keyPath
      const first = items[0]

      if (!first) {
        return []
      }

      items.sort(isNaN(first[key]) ? undefined : ((a, b) => a[key] - b[key]))

      const index = _findMax(items, key, upperBound)

      if (index === -1) {
        return []
      }

      const deleted = items.splice(0, index + 1)

      QuickStorage[storeName] = items

      return deleted
    })
}

/**
 * Clear all records from a particular store
 *
 * @param {string} storeName
 * @returns {Promise}
 */
function clear (storeName) {

  _open()

  return new Promise(resolve => {
    QuickStorage[storeName] = []
    resolve({})
  })
}

/**
 * Does nothing, it simply matches the common storage interface
 */
function destroy () {}

export default {
  isSupported,
  getAll,
  getFirst,
  getItem,
  filterBy,
  addItem,
  addBulk,
  updateItem,
  deleteItem,
  deleteBulk,
  clear,
  destroy
}
