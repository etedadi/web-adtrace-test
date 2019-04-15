/* eslint-disable */
import * as PubSub from '../pub-sub'
import * as Queue from '../queue'
import * as Time from '../time'
import * as Session from '../session'
import * as event from '../event'
import * as Config from '../config'
import * as Identity from '../identity'
import * as GlobalParams from '../global-params'
import mainInstance from '../main.js'
import sameInstance from '../main.js'

jest.useFakeTimers()

const external = {
  attributionCb () {}
}

describe('test uninitiated instance', () => {
  it('throws an error when not all parameters provided', () => {

    expect.assertions(3)

    expect(() => {
      mainInstance.init()
    }).toThrowError(new Error('You must define app_token, environment and os_name'))

    expect(() => {
      mainInstance.init({
        app_token: 'a-token'
      })
    }).toThrow(new Error('You must define environment and os_name'))

    expect(() => {
      mainInstance.init({
        app_token: 'a-token',
        environment: 'production'
      })
    }).toThrow(new Error('You must define os_name'))

  })

  it('throws an error when trying to skip init', () => {

    expect.assertions(1)

    expect(() => {
      mainInstance.trackEvent()
    }).toThrow(new Error('You must init your instance'))

  })
})

describe('test initiated instance', () => {
  beforeAll(() => {
    jest.spyOn(external, 'attributionCb')
    jest.spyOn(PubSub, 'subscribe')
    jest.spyOn(Queue.default, 'push').mockImplementation(() => {})
    jest.spyOn(Queue.default, 'run').mockImplementation(() => {})
    jest.spyOn(Time, 'getTimestamp').mockReturnValue('some-time')
    jest.spyOn(Session, 'watchSession').mockImplementation(() => {})
    jest.spyOn(event, 'default').mockImplementation(() => {})
    jest.spyOn(GlobalParams, 'add').mockImplementation(() => {})
    jest.spyOn(GlobalParams, 'remove').mockImplementation(() => {})
    jest.spyOn(Identity, 'startActivityState')

    mainInstance.init({
      app_token: 'some-app-token',
      environment: 'production',
      os_name: 'android'
    }, external.attributionCb)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.clearAllTimers()
    jest.restoreAllMocks()
    localStorage.clear()
    mainInstance.destroy()
  })

  it('sets basic configuration', () => {

    expect(Config.default.baseParams.app_token).toEqual('some-app-token')
    expect(Config.default.baseParams.environment).toEqual('production')
    expect(Config.default.baseParams.os_name).toEqual('android')
    expect(PubSub.subscribe).toHaveBeenCalledWith('attribution:change', external.attributionCb)
    expect(Identity.startActivityState).toHaveBeenCalledTimes(1)
    expect(Queue.default.run).toHaveBeenCalledTimes(1)
    expect(Session.watchSession).toHaveBeenCalledTimes(1)

  })

  it('calls client-defined attribution callback when attribution is changed', () => {

    PubSub.publish('attribution:change', {tracker_token: 'some-token'})

    jest.runAllTimers()

    expect(external.attributionCb).toHaveBeenCalledWith('attribution:change', {tracker_token: 'some-token'})

  })

  it('tests if single instance is returned', () => {

    expect(() => {
      sameInstance.init({
        app_token: 'some-other-app-token',
        environment: 'production',
        os_name: 'ios'
      })
    }).toThrow(new Error('You already initiated your instance'))

    expect(mainInstance).toBe(sameInstance)
    expect(Config.default.baseParams.app_token).toEqual('some-app-token')
    expect(Config.default.baseParams.environment).toEqual('production')
    expect(Config.default.baseParams.os_name).toEqual('android')

  })

  it('performs track event call', () => {

    mainInstance.trackEvent({event_token: 'blabla'})

    expect(event.default).toHaveBeenCalledWith({event_token: 'blabla'})

  })

  it('adds global callback parameters', () => {

    const params = [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'}
    ]

    mainInstance.addGlobalCallbackParameters(params)

    expect(GlobalParams.add).toHaveBeenCalledWith(params, 'callback')

  })

  it('adds global partner parameters', () => {

    const params = [
      {key: 'key1', value: 'value1'},
      {key: 'key2', value: 'value2'}
    ]

    mainInstance.addGlobalPartnerParameters(params)

    expect(GlobalParams.add).toHaveBeenCalledWith(params, 'partner')

  })

  it('removes global callback parameter', () => {

    mainInstance.removeGlobalCallbackParameter('some-key')

    expect(GlobalParams.remove).toHaveBeenCalledWith('some-key', 'callback')

  })

  it('removes global partner parameter', () => {

    mainInstance.removePartnerCallbackParameter('some-key')

    expect(GlobalParams.remove).toHaveBeenCalledWith('some-key', 'partner')

  })
})





