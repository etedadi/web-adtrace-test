// @flow
import {
  type InitOptionsT,
  type LogOptionsT,
  type EventParamsT,
  type GlobalParamsT,
  type CustomErrorT,
  type ActivityStateMapT,
} from './types'
import Config from './config'
import Storage from './storage/storage'
import Logger from './logger'
import {run as queueRun, setOffline, clear as queueClear, destroy as queueDestroy} from './queue'
import {subscribe, unsubscribe, destroy as pubSubDestroy} from './pub-sub'
import {watch as sessionWatch, destroy as sessionDestroy} from './session'
import {start, clear as identityClear, destroy as identityDestroy} from './identity'
import {add, remove, removeAll, clear as globalParamsClear} from './global-params'
import {check as attributionCheck, destroy as attributionDestroy} from './attribution'
import {disable, restore, status} from './disable'
import {check as gdprForgetCheck, finish as gdprDisableFinish, destroy as gdprForgetDestroy} from './gdpr-forget-device'
import {check as sharingDisableCheck, finish as sharingDisableFinish} from './third-party-sharing'
import {register as listenersRegister, destroy as listenersDestroy} from './listeners'
import {delay, flush, destroy as schedulerDestroy} from './scheduler'
import event from './event'
import sdkClick from './sdk-click'
import ActivityState from './activity-state'
import { STORAGE_TYPES } from './constants'


type InitConfigT = $ReadOnly<{|...InitOptionsT, ...LogOptionsT|}>

/**
 * In-memory parameters to be used if restarting
 *
 * @type {Object}
 * @private
 */
let _options: ?InitOptionsT = null

/**
 * Flag to mark id sdk is in starting process
 *
 * @type {boolean}
 * @private
 */
let _isInitialising: boolean = false

/**
 * Flag to mark if sdk is started
 *
 * @type {boolean}
 * @private
 */
let _isStarted: boolean = false

/**
 * Flag to mark if sdk is installed to delay public methods until SDK is ready to perform them
 *
 * @type {boolean}
 * @private
 */
let _isInstalled: boolean = false

/**
 * Initiate the instance with parameters
 *
 * @param {Object} options
 * @param {string} logLevel
 * @param {string} logOutput
 */
function initSdk ({logLevel, logOutput, ...options}: InitConfigT = {}): void {
  Logger.setLogLevel(logLevel, logOutput)

  if (_isInitialised()) {
    Logger.error('You already initiated your instance')
    return
  }

  if (Config.hasMissing(options)) {
    return
  }

  _isInitialising = true

  Storage.init(options.namespace)
    .then(availableStorage => {

      if (availableStorage.type === STORAGE_TYPES.NO_STORAGE) {
        Logger.error('Adtrace SDK can not start, there is no storage available')
        return
      }

      Logger.info(`Available storage is ${availableStorage.type}`)

      _options = { ...options }

      _start(options)
    })
}

/**
 * Track event with already initiated instance
 *
 * @param {Object} params
 */
function trackEvent (params: EventParamsT): void {
  _preCheck('track event', (timestamp) => event(params, timestamp), {
    schedule: true,
    stopBeforeInit: true
  })
}

/**
 * Add global callback parameters
 *
 * @param {Array} params
 */
function addGlobalCallbackParameters (params: Array<GlobalParamsT>): void {
  _preCheck('add global callback parameters', () => add(params, 'callback'))
}

/**
 * Add global value parameters
 *
 * @param {Array} params
 */
function addGlobalValueParameters (params: Array<GlobalParamsT>): void {
  _preCheck('add global value parameters', () => add(params, 'value'))
}

/**
 * Remove global callback parameter by key
 *
 * @param {string} key
 */
function removeGlobalCallbackParameter (key: string): void {
  _preCheck('remove global callback parameter', () => remove(key, 'callback'))
}

/**
 * Remove global value parameter by key
 *
 * @param {string} key
 */
function removeGlobalValueParameter (key: string): void {
  _preCheck('remove global value parameter', () => remove(key, 'value'))
}

/**
 * Remove all global callback parameters
 */
function clearGlobalCallbackParameters (): void {
  _preCheck('remove all global callback parameters', () => removeAll('callback'))
}

/**
 * Remove all global value parameters
 */
function clearGlobalValueParameters (): void {
  _preCheck('remove all global value parameters', () => removeAll('value'))
}

/**
 * Switch offline mode
 */
function switchToOfflineMode (): void {
  _preCheck('set offline mode', () => setOffline(true))
}

/**
 * Switch online mode
 */
function switchBackToOnlineMode (): void {
  _preCheck('set online mode', () => setOffline(false))
}

/**
 * Stop SDK
 */
function stop (): void {
  const done = disable()

  if (done && Config.isInitialised()) {
    _shutdown()
  }
}

/**
 * Restart sdk if not GDPR forgotten
 */
function restart (): void {
  const done = restore()

  if (done && _options) {
    _start(_options)
  }
}



function session (): void {
  const isInstalled = ActivityState.current.installed
  sessionWatch()
    .then(() => {
      _isInitialising = false
      _isStarted = true

      if (isInstalled) {
        _handleSdkInstalled()
        sharingDisableCheck()
      }
    })
}

/**
 * Disable sdk and send GDPR-Forget-Me request
 */
function gdprForgetMe (): void {
  // let done = forget()
  //
  // if (!done) {
  //   return
  // }
  //
  // done = gdprDisable()
  //
  // if (done && Config.isInitialised()) {
  //   _pause()
  // }
}

/**
 * Disable third party sharing
 */
function disableThirdPartySharing (): void {
  // _preCheck('disable third-party sharing', _handleDisableThirdPartySharing, {
  //   schedule: true,
  //   stopBeforeInit: false
  // })
}

function initSmartBanner () {

}

/**
 * Handle third party sharing disable
 *
 * @private
 */


/**
 * Handle GDPR-Forget-Me response
 *
 * @private
 */
function _handleGdprForgetMe (): void {
  if (status() !== 'paused') {
    return
  }

  gdprDisableFinish()

  Promise.all([
    identityClear(),
    globalParamsClear(),
    queueClear()
  ]).then(_destroy)

}

/**
 * Check if sdk initialisation was started
 *
 * @private
 */
function _isInitialised (): boolean {
  return _isInitialising || Config.isInitialised()
}

/**
 * Pause sdk by canceling:
 * - queue execution
 * - session watch
 * - attribution listener
 *
 * @private
 */
function _pause (): void {
  _isInitialising = false
  _isStarted = false

  schedulerDestroy()
  queueDestroy()
  sessionDestroy()
  attributionDestroy()
}

/**
 * Shutdown all dependencies
 * @private
 */
function _shutdown (async): void {
  if (async) {
    Logger.log('Adtrace SDK has been shutdown due to asynchronous disable')
  }

  _pause()

  pubSubDestroy()
  identityDestroy()
  listenersDestroy()
  Storage.destroy()
  Config.destroy()
}

/**
 * Destroy the instance
 *
 * @private
 */
function _destroy (): void {
  _isInstalled = false

  _shutdown()
  gdprForgetDestroy()

  _options = null

  Logger.log('Adtrace SDK instance has been destroyed')
}

/**
 * Check the sdk status and proceed with certain actions
 *
 * @param {Object} activityState
 * @returns {Promise|boolean}
 * @private
 */
function _continue (activityState: ActivityStateMapT): Promise<void> {
  Logger.log(`Adtrace SDK is starting with web_uuid set to ${activityState.uuid}`)

  const isInstalled = ActivityState.current.installed

  gdprForgetCheck()

  if (!isInstalled) {
    sharingDisableCheck()
  }

  const sdkStatus = status()
  let message = (rest) => `Adtrace SDK start has been interrupted ${rest}`

  if (sdkStatus === 'off') {
    _shutdown()
    return Promise.reject({interrupted: true, message: message('due to complete async disable')})
  }

  if (sdkStatus === 'paused') {
    _pause()
    return Promise.reject({interrupted: true, message: message('due to partial async disable')})
  }

  if (_isStarted) {
    return Promise.reject({interrupted: true, message: message('due to multiple synchronous start attempt')})
  }

  queueRun({cleanUp: true})

  return sessionWatch()
    .then(() => {
      _isInitialising = false
      _isStarted = true

      if (isInstalled) {
        _handleSdkInstalled()
        sharingDisableCheck()
      }
    })

}

/**
 * Handles SDK installed and runs delayed tasks
 */
function _handleSdkInstalled () {
  _isInstalled = true

  flush()

  unsubscribe('sdk:installed')
}

/**
 * Handle error coming from the chain of commands
 *
 * @param {Object|Error} error
 * @private
 */
function _error (error: CustomErrorT | Error) {
  if (error.interrupted) {
    Logger.log(error.message)
    return
  }

  _shutdown()
  Logger.error('Adtrace SDK start has been canceled due to an error', error)

  if (error.stack) {
    throw error
  }
}

/**
 * Start the execution by preparing the environment for the current usage
 * - prepares mandatory parameters
 * - register some global event listeners (online, offline events)
 * - subscribe to a GDPR-Forget-Me request event
 * - subscribe to the attribution change event
 * - register activity state if doesn't exist
 * - run pending GDPR-Forget-Me if pending
 * - run the package queue if not empty
 * - start watching the session
 *
 * @param {Object} options
 * @param {string} options.appToken
 * @param {string} options.environment
 * @param {string=} options.defaultTracker
 * @param {string=} options.externalDeviceId
 * @param {string=} options.customUrl
 * @param {number=} options.eventDeduplicationListLimit
 * @param {Function=} options.attributionCallback
 * @private
 */
function _start (options: InitOptionsT): void {
  if (status() === 'off') {
    Logger.log('Adtrace SDK is disabled, can not start the sdk')
    return
  }

  Config.set(options)

  listenersRegister()

  subscribe('sdk:installed', _handleSdkInstalled)
  subscribe('sdk:shutdown', () => _shutdown(true))
  subscribe('sdk:gdpr-forget-me', _handleGdprForgetMe)
  subscribe('sdk:third-party-sharing-opt-out', sharingDisableFinish)
  subscribe('attribution:check', (e, result) => attributionCheck(result))

  if (typeof options.attributionCallback === 'function') {
    subscribe('attribution:change', options.attributionCallback)
  }

  start()
    .then(_continue)
    .then(sdkClick)
    .catch(_error)
}

/**
 * Check if it's possible to run provided method
 *
 * @param {string} description
 * @param {Function} callback
 * @param {boolean=false} schedule
 * @private
 */
function _preCheck (description: string, callback: () => mixed, {schedule, stopBeforeInit}: {schedule?: boolean, stopBeforeInit?: boolean} = {}) {
  if (Storage.getType() === STORAGE_TYPES.NO_STORAGE) {
    Logger.log(`Adtrace SDK can not ${description}, no storage available`)
    return
  }

  if (status() !== 'on') {
    Logger.log(`Adtrace SDK is disabled, can not ${description}`)
    return
  }

  if (schedule && stopBeforeInit && !_isInitialised()) {
    Logger.error(`Adtrace SDK can not ${description}, sdk instance is not initialized`)
    return
  }

  if (typeof callback === 'function') {
    if (schedule && !(_isInstalled && _isStarted) && (stopBeforeInit || _isInitialised())) {
      delay(callback, description)
      Logger.log(`Running ${description} is delayed until Adtrace SDK is up`)
    } else {
      callback()
    }
  }
}

function _clearDatabase () {
  return Storage.deleteDatabase()
}

const Adtrace = {
  initSdk,
  trackEvent,
  addGlobalCallbackParameters,
  addGlobalValueParameters,
  removeGlobalCallbackParameter,
  removeGlobalValueParameter,
  clearGlobalCallbackParameters,
  clearGlobalValueParameters,
  switchToOfflineMode,
  switchBackToOnlineMode,
  stop,
  restart,
  session,
  gdprForgetMe,
  disableThirdPartySharing,
  initSmartBanner,
  __testonly__: {
    destroy: _destroy,
    clearDatabase: _clearDatabase
  }
}

export default Adtrace
