// @flow

type AttributionHttpResultT = $ReadOnly<{
  tracker_token: string,
  tracker_name: string,
  network: string,
  campaign: string,
  adgroup: string,
  creative: string,
  click_label: string,
  state: string
}>

export type AttributionWhiteListT = $ReadOnlyArray<$Keys<AttributionHttpResultT>>

export type HttpResultT = $ReadOnly<{
  adid: string,
  continue_in: number,
  retry_in: number,
  ask_in: number,
  attribution: AttributionHttpResultT
}>

type HttpFinishCb = () => void

type HttpRetryCb = (number) => Promise<HttpResultT>

export type HttpContinueCbT = (HttpResultT, HttpFinishCb, HttpRetryCb) => mixed

export type AttributionStateT = {|
  state: 'same' | 'changed'
|}

export type BackOffStrategyT = 'long' | 'short' | 'test'

export type GlobalParamsT = {|
  key: string,
  value: string
|}

export type GlobalParamsMapT = {
  callbackParams: Array<GlobalParamsT>,
  partnerParams: Array<GlobalParamsT>
}

export type EventParamsT = {|
  eventToken: string,
  revenue?: number,
  currency?: string,
  callbackParams?: Array<GlobalParamsT>,
  partnerParams?: Array<GlobalParamsT>
|}

export type ActivityStateMapT = {[key: string]: mixed} // TODO do the exact type


