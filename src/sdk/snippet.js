/* eslint-disable */
(function (window, document, tag, url, sdkName, methods, placeholder, script, first) {

  var queueName = sdkName + '_q';

  window[sdkName] = window[sdkName] || {};
  window[queueName] = window[queueName] || [];

  for (var i = 0; i < methods.length; i++) {
    placeholder(window[sdkName], window[queueName], methods[i]);
  }

  script = document.createElement(tag);
  first = document.getElementsByTagName(tag)[0];
  script.async = true;
  script.src = url;

  script.onload = function () {
    for (var i = 0; i < window[queueName].length; i++) {
      window[sdkName][window[queueName][i][0]].apply(window[sdkName], window[queueName][i][1]);
    }
    window[queueName] = [];
  }
  first.parentNode.insertBefore(script, first);
})(
  window,
  document,
  'script',
  'https://cdn.adtrace.io/adtrace-latest.min.js',
  'Adtrace',
  [
    'initSdk',
    'trackEvent',
    'addGlobalCallbackParameters',
    'addGlobalValueParameters',
    'removeGlobalCallbackParameter',
    'removeGlobalValueParameter',
    'clearGlobalCallbackParameters',
    'clearGlobalValueParameters',
    'switchToOfflineMode',
    'switchBackToOnlineMode',
    'stop',
    'restart',
    'gdprForgetMe',
    'disableThirdPartySharing',
    'initSmartBanner'
  ],
  function (context, queue, methodName) {
    context[methodName] = function () {
      queue.push([methodName, arguments]);
    };
  }
)
