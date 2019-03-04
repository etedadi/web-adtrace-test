/* eslint-disable */
import * as Attribution from '../attribution'
import * as request from '../request'
import * as Storage from '../storage'
import * as PubSub from '../pub-sub'
import * as Time from '../time'

jest.mock('../request')
jest.useFakeTimers()

function flushPromises() {
  return new Promise(resolve => setImmediate(resolve))
}

describe('test attribution functionality', () => {

  beforeAll(() => {
    jest.spyOn(request, 'default')
    jest.spyOn(Storage, 'setItem')
    jest.spyOn(Storage, 'getItem')
    jest.spyOn(PubSub, 'publish')
    jest.spyOn(Time, 'getTimestamp').mockReturnValue('some-time')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.clearAllTimers()
    jest.restoreAllMocks()
  })

  it('does not do anything if there is no ask_in parameter', () => {

    expect.assertions(2)

    Attribution.checkAttribution({some: 'thing'})
      .then(result => {
        expect(result).toEqual({some: 'thing'})
        expect(setTimeout).not.toHaveBeenCalled()
      })

    jest.runAllTimers()

  })

  it('sets timeout for attribution endpoint to be called which returns same attribution as before', () => {

    const currentAttribution = {adid: '123', attribution: {tracker_token: '123abc', tracker_name: 'tracker', network: 'bla'}}

    Storage.getItem.mockReturnValue(Object.assign({adid: '123'}, currentAttribution.attribution))
    request.default.mockResolvedValue(currentAttribution)

    expect.assertions(5)

    Attribution.checkAttribution({ask_in: 3000}, {some: 'params'})
      .then(result => {
        expect(result).toEqual(currentAttribution)
        expect(setTimeout.mock.calls[0][1]).toBe(3000)
        expect(request.default).toHaveBeenCalledWith({
          url: '/attribution',
          params: {
            some: 'params',
            created_at: 'some-time'
          }
        })
        expect(Storage.setItem).not.toHaveBeenCalled()
        expect(PubSub.publish).not.toHaveBeenCalled()
      })

    jest.runAllTimers()
  })

  it('sets timeout for attribution endpoint to be called which returns different attribution (network is different)', () => {

    const oldAttribution = {adid: '123', tracker_token: '123abc', tracker_name: 'tracker', network: 'old'}
    const newAttribution = {adid: '123', attribution: {tracker_token: '123abc', tracker_name: 'tracker', network: 'new'}}

    Storage.getItem.mockReturnValue(oldAttribution)
    request.default.mockResolvedValue(newAttribution)

    expect.assertions(5)

    Attribution.checkAttribution({ask_in: 2000}, {some: 'params'})
      .then(result => {
        expect(result).toEqual(newAttribution)
        expect(setTimeout.mock.calls[0][1]).toBe(2000)
        expect(request.default).toHaveBeenCalledWith({
          url: '/attribution',
          params: {
            some: 'params',
            created_at: 'some-time'
          }
        })

        expect(Storage.setItem).toHaveBeenCalledWith('attribution', {adid: '123', tracker_token: '123abc', tracker_name: 'tracker', network: 'new'})
        expect(PubSub.publish).toHaveBeenCalledWith('attribution:change', newAttribution)
      })

    jest.runAllTimers()

  })

  it('sets timeout for attribution endpoint to be called which returns different attribution (tracker_name is different)', () => {

    const oldAttribution = {adid: '123', tracker_token: '123abc', tracker_name: 'tracker', network: 'old'}
    const newAttribution = {adid: '123', attribution: {tracker_token: '123abc', tracker_name: 'tracker new', network: 'old'}}

    Storage.getItem.mockReturnValue(oldAttribution)
    request.default.mockResolvedValue(newAttribution)

    expect.assertions(5)

    Attribution.checkAttribution({ask_in: 2000}, {base: {app_token: '123abc', environment: 'sandbox', os_name: 'ios'}})
      .then(result => {
        expect(result).toEqual(newAttribution)
        expect(setTimeout.mock.calls[0][1]).toBe(2000)
        expect(request.default).toHaveBeenCalledWith({
          url: '/attribution',
          params: {
            app_token: '123abc',
            environment: 'sandbox',
            os_name: 'ios',
            created_at: 'some-time'
          }
        })

        expect(Storage.setItem).toHaveBeenCalledWith('attribution', {adid: '123', tracker_token: '123abc', tracker_name: 'tracker new', network: 'old'})
        expect(PubSub.publish).toHaveBeenCalledWith('attribution:change', newAttribution)
      })

    jest.runAllTimers()

  })

  it('sets timeout for attribution endpoint to be called which returns ask_in', () => {

    const oldAttribution = {adid: '123', tracker_token: '123abc', tracker_name: 'tracker', network: 'old'}
    const newAttribution = {adid: '123', attribution: {tracker_token: '123abc', tracker_name: 'tracker', network: 'newest'}}

    Storage.getItem.mockReturnValue(oldAttribution)
    request.default.mockResolvedValue({ask_in: 3000})

    Attribution.checkAttribution({ask_in: 2000}, {some: 'params'})

    jest.advanceTimersByTime(1)

    expect.assertions(10)

    return flushPromises()
      .then(() => {

        expect(setTimeout).toHaveBeenCalledTimes(1)
        expect(setTimeout.mock.calls[0][1]).toEqual(2000)
        expect(Storage.setItem).not.toHaveBeenCalled()
        expect(PubSub.publish).not.toHaveBeenCalled()

        jest.advanceTimersByTime(2001)

        return flushPromises()
      }).then(() => {

        expect(setTimeout).toHaveBeenCalledTimes(2)
        expect(setTimeout.mock.calls[1][1]).toEqual(3000)
        expect(Storage.setItem).not.toHaveBeenCalled()
        expect(PubSub.publish).not.toHaveBeenCalled()

        request.default.mockClear()
        request.default.mockResolvedValue(newAttribution)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(Storage.setItem).toHaveBeenCalledWith('attribution', {adid: '123', tracker_token: '123abc', tracker_name: 'tracker', network: 'newest'})
        expect(PubSub.publish).toHaveBeenCalledWith('attribution:change', newAttribution)
      })
  })

  it('retires attribution request when failed request', () => {

    const currentAttribution = {adid: '123', attribution: {tracker_token: '123abc', tracker_name: 'tracker', network: 'bla'}}

    request.default.mockRejectedValue({error: 'An error'})

    Attribution.checkAttribution({ask_in: 2000}, {some: 'params'})

    jest.advanceTimersByTime(1)

    expect.assertions(16)

    return flushPromises()
      .then(() => {
        expect(setTimeout).toHaveBeenCalledTimes(1)
        expect(setTimeout.mock.calls[0][1]).toEqual(2000)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(request.default).toHaveBeenCalledTimes(1)
        expect(setTimeout).toHaveBeenCalledTimes(2)
        expect(setTimeout.mock.calls[1][1]).toEqual(100)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(request.default).toHaveBeenCalledTimes(2)
        expect(setTimeout).toHaveBeenCalledTimes(3)
        expect(setTimeout.mock.calls[2][1]).toEqual(200)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(request.default).toHaveBeenCalledTimes(3)
        expect(setTimeout).toHaveBeenCalledTimes(4)
        expect(setTimeout.mock.calls[3][1]).toEqual(300)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(request.default).toHaveBeenCalledTimes(4)
        expect(setTimeout).toHaveBeenCalledTimes(5)
        expect(setTimeout.mock.calls[4][1]).toEqual(300)

        setTimeout.mockClear()
        request.default.mockClear()
        request.default.mockResolvedValue(currentAttribution)

        jest.runOnlyPendingTimers()

        return flushPromises()
      }).then(() => {
        expect(request.default).toHaveBeenCalledTimes(1)
        expect(setTimeout).not.toHaveBeenCalled()

        return flushPromises()
      })
  })

})
