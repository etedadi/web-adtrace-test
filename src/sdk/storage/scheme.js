import {REASON_GDPR, REASON_GENERAL} from '../constants'

const _queueName = 'q'
const _queueScheme = {
  keyPath: 'timestamp',
  autoIncrement: false,
  fields: {
    url: {
      key: 'u',
      values: {
        '/session': 1,
        '/event': 2,
        '/gdpr_forget_device': 3
      }
    },
    method: {
      key: 'm',
      values: {
        GET: 1,
        POST: 2,
        PUT: 3,
        DELETE: 4
      }
    },
    timestamp: {
      key: 't'
    },
    params: {
      key: 'p',
      keys: {
        createdAt: 'ca',
        timeSpent: 'ts',
        sessionLength: 'sl',
        sessionCount: 'sc',
        eventCount: 'ec',
        lastInterval: 'li',
        eventToken: 'et',
        revenue: 're',
        currency: 'cu',
        callbackParams: 'cp',
        partnerParams: 'pp'
      }
    }
  }
}

const _activityStateName = 'as'
const _activityStateScheme = {
  keyPath: 'uuid',
  autoIncrement: false,
  fields: {
    uuid: {
      key: 'u',
      values: {
        unknown: '-'
      }
    },
    timeSpent: 'ts',
    sessionLength: 'sl',
    sessionCount: 'sc',
    eventCount: 'ec',
    lastActive: 'la',
    lastInterval: 'li',
    installed: {
      key: 'in',
      values: {
        false: 0,
        true: 1
      }
    },
    attribution: {
      key: 'at',
      keys: {
        adid: 'a',
        tracker_token: 'tt',
        tracker_name: 'tn',
        network: 'nt',
        campaign: 'cm',
        adgroup: 'ag',
        creative: 'cr',
        click_label: 'cl',
        state: {
          key: 'st',
          values: {
            installed: 1,
            reattributed: 2
          }
        }
      }
    }
  }
}

const _globalParamsName = 'gp'
const _globalParamsScheme = {
  keyPath: 'keyType',
  autoIncrement: false,
  index: 'type',
  fields: {
    keyType: {
      key: 'kt',
      composite: ['key', 'type']
    },
    key: 'k',
    value: 'v',
    type: {
      key: 't',
      values: {
        callback: 1,
        partner: 2
      }
    }
  }
}

const _eventDeduplicationName = 'ed'
const _eventDeduplicationScheme = {
  keyPath: 'internalId',
  autoIncrement: true,
  fields: {
    internalId: 'ii',
    id: 'i'
  }
}

const _disabledName = 'd'
const _disabledScheme = {
  keyPath: 'reason',
  fields: {
    reason: {
      key: 'r',
      values: {
        [REASON_GENERAL]: 1,
        [REASON_GDPR]: 2
      }
    },
    pending: {
      key: 'p',
      values: {
        false: 0,
        true: 1
      }
    }
  }
}

export default {
  queue: {
    name: _queueName,
    scheme: _queueScheme
  },
  activityState: {
    name: _activityStateName,
    scheme: _activityStateScheme
  },
  globalParams: {
    name: _globalParamsName,
    scheme: _globalParamsScheme
  },
  eventDeduplication: {
    name: _eventDeduplicationName,
    scheme: _eventDeduplicationScheme
  },
  disabled: {
    name: _disabledName,
    scheme: _disabledScheme,
    permanent: true
  }
}
