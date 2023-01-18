var isSuspicious = false;
var botHunterApiUrl = 'https://bot-hunter-77.loca.lt';

// Retrieve client IP and location
function getClientIp() {
  return fetch('https://api.ipify.org?format=json')
    .then(function (response) {
      console.log('response', response);
      // return response.json();
    })
    .then(function (data) {
      console.log('data ip', data);
      clientInfo.ip = data.ip;
      return fetch('https://ipapi.co/' + data.ip + '/json/');
    })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log('data location', data);
    })
    .catch((err) => console.log(err));
}

window.onload = function () {
  // getClientIp();
};

window.onloadstart = function () {
  registerVisitor();
};

function getClientInformation() {
  const canExecuteJs = typeof registerVisitor === 'function';
  return {
    canExecuteJs,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    vendor: navigator.vendor,
    appVersion: navigator.appVersion,
    appName: navigator.appName,
    appCodeName: navigator.appCodeName,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    product: navigator.product,
    productSub: navigator.productSub,
    vendorSub: navigator.vendorSub,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    msManipulationViewsEnabled: navigator.msManipulationViewsEnabled,
    msMaxTouchPoints: navigator.msMaxTouchPoints,
    msPointerEnabled: navigator.msPointerEnabled,
    pointerEnabled: navigator.pointerEnabled,
    serviceWorker: navigator.serviceWorker,
    webdriver: navigator.webdriver,
    deviceMemory: navigator.deviceMemory,
    languages: navigator.languages,
    // plugins: navigator.plugins,
    mimeTypes: navigator.mimeTypes,
    screen: {
      width: screen.width,
      height: screen.height,
      availLeft: screen.availLeft,
      availTop: screen.availTop,
      availHeight: screen.availHeight,
      availWidth: screen.availWidth,
      colorDepth: screen.colorDepth,
      id: screen.id,
      internal: screen.internal,
      left: screen.left,
      orientation: screen.orientation,
      pixelDepth: screen.pixelDepth,
      primary: screen.primary,
      scaleFactor: screen.scaleFactor,
      top: screen.top
    },
    location: {
      hash: location.hash,
      host: location.host,
      hostname: location.hostname,
      href: location.href,
      origin: location.origin,
      pathname: location.pathname,
      port: location.port,
      protocol: location.protocol,
      search: location.search
    },
    history: {
      length: history.length,
      state: history.state
    },
    performance: {
      navigation: performance.navigation,
      timing: performance.timing
    }
  };
}

// #############
// # Flagging
// #############
// Session tracking
var startTime = Date.now();
var sessionDurations = [];
// calculate the duration when the user leaves the website
window.onbeforeunload = function () {
  var endTime = Date.now();
  sessionDurations.push(endTime - startTime);
  trackSession();
};

function trackSession() {
  var avgSessionDuration = sessionDurations.reduce((acc, curr) => acc + curr, 0) / sessionDurations.length;
  // Check if sessions are abnormally long i.e. More than 3 mins, if yes, send to api
  if (avgSessionDuration < 180000) {
    return;
  }
  flag('session', avgSessionDuration);
}

function flag(reason, value) {
  var body = {
    flagData: {
      reason,
      value
    },
    clientInformation: getClientInformation()
  };
  fetch(botHunterApiUrl + '/flag', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).catch((err) => console.log(err));
}

// #############
// # Visitor tracking
// #############
async function registerVisitor(reason, value) {
  var body = {
    clientInformation: getClientInformation(),
    page: window.location.href,
    visitedAt: Date.now()
  };
  fetch(botHunterApiUrl + '/visitors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).catch((err) => console.log(err));
}

// ##############
// # EVENT LISTENERS
// ##############
var trackedEvents = [
  'mousedown',
  'mousemove',
  'mouseup',
  'click',
  'dblclick',
  'contextmenu',
  'wheel',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'pointermove',
  'focusin',
  'focusout',
  'pointerdown',
  'pointerup',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'gotpointercapture',
  'lostpointercapture',
  'dragstart',
  'drag',
  'dragend',
  'dragenter',
  'dragover',
  'dragleave',
  'drop',
  'selectstart',
  'selectionchange',
  'select',
  'wheel'
];
var _userActions = [];
var _detectedEvents = [];
var _detectedEventsPrev = [];
var onClick = Element.prototype.addEventListener;
Element.prototype.addEventListener = function (event, callback, useCapture) {
  // Check if any of the untracked actions are in the event
  if (trackedEvents.some((action) => event.includes(action))) {
    // console.log('event', event);
    var _callback = callback;
    callback = function (e) {
      _detectedEvents.push(event);
      _userActions.unshift({ event, time: Date.now() });
      _callback.apply(this, arguments);
    };
  }
  onClick.call(this, event, callback, useCapture);
};

function evaluateEvents() {
  var avgTClicks = getAverageTimeBetweenEvents('click');
  var avgTKeydown = getAverageTimeBetweenEvents('keydown');
  var avgTScroll = getAverageTimeBetweenEvents('scroll');
  return {
    avgTClicks,
    avgTKeydown,
    avgTScroll
  };
}

function getAverageTimeBetweenEvents(event) {
  // Evaluate time between clicks
  var timeBetweenEvents = [];
  // Reduce the array to only the click events unique events based on event and time
  var clickEvents = _userActions.reduce((acc, curr) => {
    if (acc.length === 0 && curr.event === event) {
      acc.push(curr);
    } else if (curr.event === event) {
      if (acc[acc.length - 1].event === curr.event && acc[acc.length - 1].time === curr.time) {
        return acc;
      } else {
        acc.push(curr);
      }
    }
    return acc;
  }, []);

  // Compare the time between each click
  for (let i = 0; i < clickEvents.length; i++) {
    if (i === clickEvents.length - 1) {
      continue;
    } else {
      var firstClick = clickEvents[i].time;
      var secondClick = clickEvents[i + 1] ? clickEvents[i + 1].time : 0;
      timeBetweenEvents.push(firstClick - secondClick);
    }
  }
  var averageTimeBetweenEventsInS = timeBetweenEvents.reduce((acc, curr) => acc + curr, 0) / timeBetweenEvents.length / 1000 || 0;
  return averageTimeBetweenEventsInS;
}

// ####################
// # Overriding methods
// ####################
// Override the XMLHttpRequest object's open method to track API calls
var open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, async) {
  // Save the original arguments
  this._openArgs = { method, url, async };
  open.call(this, method, url, async);
};
var send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = async function () {
  if (isSuspicious) {
    // Block API calls if the user is flagged
    return;
  }
  var endPoints = window.bhOptions.endpoints;
  // var endPoints = ['http://localhost:3000'];
  // Check if one of the endpoints is in the url
  var isEndPoint = endPoints.some((endPoint) => this._openArgs.url.startsWith(endPoint));
  console.log(isEndPoint)
  if (isEndPoint) {
    // Send the tracking data to the server
    evaluateRequest.apply(this, arguments);
    this.onreadystatechange = function () {
      // Request finished and response is ready
      if (this.readyState === 4) {
        requestEnd = Date.now();
        // sendRTT.call(this);
      }
    };
  }
  send.apply(this, arguments);
};

//  ###############
// # BOT HUNTER API CALLS
// ###############
async function evaluateRequest() {
  var body = {
    url: this._openArgs.url,
    method: this._openArgs.method,
    // request: arguments[0],
    userActions: _userActions || [],
    eventStats: evaluateEvents(),
    clientInformation: getClientInformation()
  };
  _userActions = [];
  requestStart = Date.now();
  console.log(botHunterApiUrl)
  fetch(botHunterApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.code === 403 && res.message === 'BOT_DETECTED') {
        isSuspicious = true;
        generateCaptcha();
      }

      if (res.code === 429 && res.message === 'TOO_MANY_REQUESTS') {
        isSuspicious = true;
        displayLimitMessage();
      }
    })
    .catch((err) => {
      console.log('err', err);
    });
}

// ########################
// # CAPTCHA
// ########################
async function generateCaptcha() {
  var body = {
    clientInformation: getClientInformation()
  };
  fetch(botHunterApiUrl + '/captcha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then((result) => {
      return result.json();
    })
    .then((result) => {
      displayCaptcha(result);
    });
}

async function resolveCaptcha(captcha) {
  var body = {
    clientInformation: getClientInformation()
  };
  return fetch(botHunterApiUrl + '/captcha/' + captcha, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function displayCaptcha(code) {
  // Replace page by captcha
  var captcha = document.createElement('div');
  captcha.innerHTML = `<body class="captcha-body" onload="createCaptcha()"> <div class="captcha-title"> <p>We've detected an abnormal activity</p><p>Please confirm you're a human</p></div><div class="captcha-form"> <form onsubmit="validateCaptcha()"> <div id="captcha"></div><input type="text" placeholder="Captcha" id="captcha-text"/> <button class="captcha-button" type="submit">Submit</button> </form> </div></body>`;
  // Add css to captcha
  var style = document.createElement('style');
  style.innerHTML = `body{height:100vh}input[type=text]{padding:12px 20px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box}.captcha-title{justify-content:center;text-align:center}.captcha-form{display:flex;justify-content:center}.captcha-button{background-color:#4caf50;border:none;color:#fff;padding:12px 30px;text-decoration:none;margin:4px 2px;cursor:pointer}#captcha{display:flex;justify-content:center;align-items:center}canvas{pointer-events:none}`;
  captcha.appendChild(style);
  document.body.innerHTML = '';
  document.body.appendChild(captcha);
  var canv = document.createElement('canvas');
  canv.id = 'captcha';
  canv.width = 100;
  canv.height = 50;
  var ctx = canv.getContext('2d');
  ctx.font = '25px Georgia';
  ctx.strokeText(code, 0, 30);
  //storing captcha so that can validate you can save it somewhere else according to your specific requirements
  // code = captcha.join('');
  document.getElementById('captcha').appendChild(canv); // adds the canvas to the body element
  // document.body.innerHTML = captcha.innerHTML;
}

function validateCaptcha() {
  event.preventDefault();
  const value = document.getElementById('captcha-text').value;
  resolveCaptcha(value)
    .then((result) => {
      if (result.status === 400) {
        throw new Error('Invalid Captcha');
      }
      // Refresh page
      window.location.reload();
    })
    .catch((err) => {
      // Regenerate captcha
      alert('Invalid Captcha. try Again');
      generateCaptcha();
    });
}

// ############
// # UTILS
// ############
function displayLimitMessage() {
  document.body.innerHTML = `<body class="captcha-body"> <div class="captcha-title"> <p>You've reached the maximum number of requests</p><p>Please try again later</p></div></body>`;
}
