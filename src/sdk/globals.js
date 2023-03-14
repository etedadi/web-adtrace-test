// @flow
declare var __ADTRACE__NAMESPACE: string
declare var __ADTRACE__SDK_VERSION: string
declare var process: {|
  env: {|
    NODE_ENV: 'development' | 'production' | 'test'
  |}
|}

const Globals = {
  namespace: __ADTRACE__NAMESPACE || 'adtrace-web-sdk',
  version: __ADTRACE__SDK_VERSION || '2.1.0',
  env: process.env.NODE_ENV
}

export default Globals
