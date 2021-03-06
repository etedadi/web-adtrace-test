import { NetworkError, NoConnectionError } from '../../../smart-banner/network/errors'
import * as UrlStrategy from '../../../url-strategy'

jest.mock('../../../logger')

describe('Network tests', () => {
  const defaultEndpoint = 'https://app.adtrace.io'
  let Network
  let xhrMock: jest.SpyInstance

  const testEndpoints = {
    default: { app: 'app.default', gdpr: '' },
    india: { app: 'app.india', gdpr: '' },
    china: { app: 'app.china', gdpr: '' }
  }
  const urlStrategyRetriesActual = UrlStrategy.urlStrategyRetries
  const urlStrategyRetriesMock = (sendRequestCb: (urls: UrlStrategy.BaseUrlsMap) => Promise<any>) => urlStrategyRetriesActual(sendRequestCb, testEndpoints)

  beforeEach(() => {
    const UrlStrategyModule = require('../../../url-strategy')
    jest.spyOn(UrlStrategyModule, 'urlStrategyRetries').mockImplementation(urlStrategyRetriesMock)

    Network = require('../../../smart-banner/network/network').Network
    xhrMock = jest.spyOn(Network, 'xhr')
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('request', () => {
    it('sends request to path with encoded params', async () => {
      expect.assertions(1)
      xhrMock.mockResolvedValue({})

      await Network.request('/whatever', { foo: 'bar', n: 42 })

      const expectedUrl = `${testEndpoints.default.app}/whatever?foo=bar&n=42`

      expect(xhrMock).toHaveBeenCalledWith(expectedUrl)
    })

    it('sends request to path without params', async () => {
      expect.assertions(1)
      xhrMock.mockResolvedValue({})

      await Network.request('/whatever')

      const expectedUrl = `${testEndpoints.default.app}/whatever`

      expect(xhrMock).toHaveBeenCalledWith(expectedUrl)
    })

    it('retries endpoints if request failed due to no network connection', async () => {
      expect.assertions(4)
      xhrMock
        .mockRejectedValueOnce(NoConnectionError)
        .mockRejectedValueOnce(NoConnectionError)
        .mockResolvedValue({})

      await Network.request('/whatever')

      expect(xhrMock).toHaveBeenCalledTimes(3)
      expect(xhrMock).toHaveBeenCalledWith(`${testEndpoints.default.app}/whatever`)
      expect(xhrMock).toHaveBeenCalledWith(`${testEndpoints.india.app}/whatever`)
      expect(xhrMock).toHaveBeenCalledWith(`${testEndpoints.china.app}/whatever`)
    })

    it('throws an error if request failed', async () => {
      expect.assertions(2)

      const err: NetworkError = { status: 400, message: 'Bad request' }
      xhrMock.mockRejectedValueOnce(err)

      try {
        await Network.request('/whatever')
      } catch (error) {
        expect(error).toEqual(err)
      }

      expect(xhrMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('getEndpoint', () => {
    it('returns default endpoint until request sent', () => {
      expect(Network.getEndpoint()).toEqual(defaultEndpoint)
    })

    it('returns default endpoint if request failed', async () => {
      expect.assertions(1)

      xhrMock.mockRejectedValue({})
      try {
        await Network.request('/whatever')
      } catch (err) {
        // nothing to do here
      }

      expect(Network.getEndpoint()).toEqual(defaultEndpoint)
    })

    it('returns last successful endpoint', async () => {
      expect.assertions(1)

      xhrMock
        .mockRejectedValueOnce(NoConnectionError)
        .mockResolvedValueOnce({})

      await Network.request('/whatever')

      expect(Network.getEndpoint()).toEqual(testEndpoints.india.app)
    })
  })
})
