'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _config = require('./config');

var _appiumBaseDriver = require('appium-base-driver');

var _appiumFakeDriver = require('appium-fake-driver');

var _appiumAndroidDriver = require('appium-android-driver');

var _appiumIosDriver = require('appium-ios-driver');

var _appiumUiautomator2Driver = require('appium-uiautomator2-driver');

var _appiumSelendroidDriver = require('appium-selendroid-driver');

var _appiumXcuitestDriver = require('appium-xcuitest-driver');

var _appiumYouiengineDriver = require('appium-youiengine-driver');

var _appiumWindowsDriver = require('appium-windows-driver');

var _appiumMacDriver = require('appium-mac-driver');

var _appiumEspressoDriver = require('appium-espresso-driver');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _asyncLock = require('async-lock');

var _asyncLock2 = _interopRequireDefault(_asyncLock);

var sessionsListGuard = new _asyncLock2['default']();
var pendingDriversGuard = new _asyncLock2['default']();

var AppiumDriver = (function (_BaseDriver) {
  _inherits(AppiumDriver, _BaseDriver);

  function AppiumDriver(args) {
    _classCallCheck(this, AppiumDriver);

    _get(Object.getPrototypeOf(AppiumDriver.prototype), 'constructor', this).call(this);

    // the main Appium Driver has no new command timeout
    this.newCommandTimeoutMs = 0;

    this.args = args;

    // Access to sessions list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.sessions = {};

    // Access to pending drivers list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.pendingDrivers = {};
  }

  // help decide which commands should be proxied to sub-drivers and which
  // should be handled by this, our umbrella driver

  /**
   * Cancel commands queueing for the umbrella Appium driver
   */

  _createClass(AppiumDriver, [{
    key: 'sessionExists',
    value: function sessionExists(sessionId) {
      var dstSession = this.sessions[sessionId];
      return dstSession && dstSession.sessionId !== null;
    }
  }, {
    key: 'driverForSession',
    value: function driverForSession(sessionId) {
      return this.sessions[sessionId];
    }
  }, {
    key: 'getDriverForCaps',
    value: function getDriverForCaps(caps) {
      // TODO if this logic ever becomes complex, should probably factor out
      // into its own file
      if (!caps.platformName || !_lodash2['default'].isString(caps.platformName)) {
        throw new Error("You must include a platformName capability");
      }

      // we don't necessarily have an `automationName` capability,
      if (caps.automationName) {
        if (caps.automationName.toLowerCase() === 'selendroid') {
          // but if we do and it is 'Selendroid', act on it
          return _appiumSelendroidDriver.SelendroidDriver;
        } else if (caps.automationName.toLowerCase() === 'uiautomator2') {
          // but if we do and it is 'Uiautomator2', act on it
          return _appiumUiautomator2Driver.AndroidUiautomator2Driver;
        } else if (caps.automationName.toLowerCase() === 'xcuitest') {
          // but if we do and it is 'XCUITest', act on it
          return _appiumXcuitestDriver.XCUITestDriver;
        } else if (caps.automationName.toLowerCase() === 'youiengine') {
          // but if we do and it is 'YouiEngine', act on it
          return _appiumYouiengineDriver.YouiEngineDriver;
        } else if (caps.automationName.toLowerCase() === 'espresso') {
          _logger2['default'].warn('The Appium Espresso driver is currently in early beta and meant only for experimental usage. Its API is not yet complete or guaranteed to work. Please report bugs to the Appium team on GitHub.');
          return _appiumEspressoDriver.EspressoDriver;
        }
      }

      if (caps.platformName.toLowerCase() === "fake") {
        return _appiumFakeDriver.FakeDriver;
      }

      if (caps.platformName.toLowerCase() === 'android') {
        return _appiumAndroidDriver.AndroidDriver;
      }

      if (caps.platformName.toLowerCase() === 'ios') {
        if (caps.platformVersion) {
          var majorVer = caps.platformVersion.toString().split(".")[0];
          if (parseInt(majorVer, 10) >= 10) {
            _logger2['default'].info("Requested iOS support with version >= 10, using XCUITest " + "driver instead of UIAutomation-based driver, since the " + "latter is unsupported on iOS 10 and up.");
            return _appiumXcuitestDriver.XCUITestDriver;
          }
        }

        return _appiumIosDriver.IosDriver;
      }

      if (caps.platformName.toLowerCase() === 'windows') {
        return _appiumWindowsDriver.WindowsDriver;
      }

      if (caps.platformName.toLowerCase() === 'mac') {
        return _appiumMacDriver.MacDriver;
      }

      var msg = undefined;
      if (caps.automationName) {
        msg = 'Could not find a driver for automationName \'' + caps.automationName + '\' and platformName ' + ('\'' + caps.platformName + '\'.');
      } else {
        msg = 'Could not find a driver for platformName \'' + caps.platformName + '\'.';
      }
      throw new Error(msg + ' Please check your desired capabilities.');
    }
  }, {
    key: 'getDriverVersion',
    value: function getDriverVersion(driver) {
      var NAME_DRIVER_MAP = {
        SelendroidDriver: 'appium-selendroid-driver',
        AndroidUiautomator2Driver: 'appium-uiautomator2-driver',
        XCUITestDriver: 'appium-xcuitest-driver',
        YouiEngineDriver: 'appium-youiengine-driver',
        FakeDriver: 'appium-fake-driver',
        AndroidDriver: 'appium-android-driver',
        IosDriver: 'appium-ios-driver',
        WindowsDriver: 'appium-windows-driver',
        MacDriver: 'appium-mac-driver'
      };
      if (!NAME_DRIVER_MAP[driver.name]) {
        _logger2['default'].warn('Unable to get version of driver \'' + driver.name + '\'');
        return;
      }

      var _require = require(NAME_DRIVER_MAP[driver.name] + '/package.json');

      var version = _require.version;

      return version;
    }
  }, {
    key: 'getStatus',
    value: function getStatus() {
      var config, gitSha, status;
      return _regeneratorRuntime.async(function getStatus$(context$2$0) {
        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.next = 2;
            return _regeneratorRuntime.awrap((0, _config.getAppiumConfig)());

          case 2:
            config = context$2$0.sent;
            gitSha = config['git-sha'];
            status = { build: { version: config.version } };

            if (typeof gitSha !== "undefined") {
              status.build.revision = gitSha;
            }
            return context$2$0.abrupt('return', status);

          case 7:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: 'getSessions',
    value: function getSessions() {
      var sessions;
      return _regeneratorRuntime.async(function getSessions$(context$2$0) {
        var _this = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.next = 2;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              return _this.sessions;
            }));

          case 2:
            sessions = context$2$0.sent;
            return context$2$0.abrupt('return', _lodash2['default'].toPairs(sessions).map(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 2);

              var id = _ref2[0];
              var driver = _ref2[1];

              return { id: id, capabilities: driver.caps };
            }));

          case 4:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: 'printNewSessionAnnouncement',
    value: function printNewSessionAnnouncement(driver, caps) {
      var driverVersion = this.getDriverVersion(driver);
      var introString = driverVersion ? 'Creating new ' + driver.name + ' (v' + driverVersion + ') session' : 'Creating new ' + driver.name + ' session';
      _logger2['default'].info(introString);
      _logger2['default'].info('Capabilities:');
      _util2['default'].inspect(caps);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(_lodash2['default'].toPairs(caps)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var cap = _step$value[0];
          var value = _step$value[1];

          _logger2['default'].info('  ' + cap + ': ' + _util2['default'].inspect(value));
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'createSession',
    value: function createSession(caps, reqCaps) {
      var InnerDriver, sessionIdsToDelete, runningDriversData, otherPendingDriversData, d, innerSessionId, dCaps, _ref3, _ref32;

      return _regeneratorRuntime.async(function createSession$(context$2$0) {
        var _this2 = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            caps = _lodash2['default'].defaults(_lodash2['default'].clone(caps), this.args.defaultCapabilities);
            InnerDriver = this.getDriverForCaps(caps);

            this.printNewSessionAnnouncement(InnerDriver, caps);

            if (!this.args.sessionOverride) {
              context$2$0.next = 16;
              break;
            }

            context$2$0.next = 6;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              return _lodash2['default'].keys(_this2.sessions);
            }));

          case 6:
            sessionIdsToDelete = context$2$0.sent;

            if (!sessionIdsToDelete.length) {
              context$2$0.next = 16;
              break;
            }

            _logger2['default'].info('Session override is on. Deleting other ' + sessionIdsToDelete.length + ' active session' + (sessionIdsToDelete.length ? '' : 's') + '.');
            context$2$0.prev = 9;
            context$2$0.next = 12;
            return _regeneratorRuntime.awrap(_bluebird2['default'].map(sessionIdsToDelete, function (id) {
              return _this2.deleteSession(id);
            }));

          case 12:
            context$2$0.next = 16;
            break;

          case 14:
            context$2$0.prev = 14;
            context$2$0.t0 = context$2$0['catch'](9);

          case 16:
            runningDriversData = undefined, otherPendingDriversData = undefined;
            d = new InnerDriver(this.args);
            context$2$0.prev = 18;
            context$2$0.next = 21;
            return _regeneratorRuntime.awrap(this.curSessionDataForDriver(InnerDriver));

          case 21:
            runningDriversData = context$2$0.sent;
            context$2$0.next = 27;
            break;

          case 24:
            context$2$0.prev = 24;
            context$2$0.t1 = context$2$0['catch'](18);
            throw new _appiumBaseDriver.errors.SessionNotCreatedError(context$2$0.t1.message);

          case 27:
            context$2$0.next = 29;
            return _regeneratorRuntime.awrap(pendingDriversGuard.acquire(AppiumDriver.name, function () {
              _this2.pendingDrivers[InnerDriver.name] = _this2.pendingDrivers[InnerDriver.name] || [];
              otherPendingDriversData = _this2.pendingDrivers[InnerDriver.name].map(function (drv) {
                return drv.driverData;
              });
              _this2.pendingDrivers[InnerDriver.name].push(d);
            }));

          case 29:
            innerSessionId = undefined, dCaps = undefined;
            context$2$0.prev = 30;
            context$2$0.next = 33;
            return _regeneratorRuntime.awrap(d.createSession(caps, reqCaps, [].concat(_toConsumableArray(runningDriversData), _toConsumableArray(otherPendingDriversData))));

          case 33:
            _ref3 = context$2$0.sent;
            _ref32 = _slicedToArray(_ref3, 2);
            innerSessionId = _ref32[0];
            dCaps = _ref32[1];
            context$2$0.next = 39;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              _this2.sessions[innerSessionId] = d;
            }));

          case 39:
            context$2$0.prev = 39;
            context$2$0.next = 42;
            return _regeneratorRuntime.awrap(pendingDriversGuard.acquire(AppiumDriver.name, function () {
              _lodash2['default'].pull(_this2.pendingDrivers[InnerDriver.name], d);
            }));

          case 42:
            return context$2$0.finish(39);

          case 43:

            // this is an async function but we don't await it because it handles
            // an out-of-band promise which is fulfilled if the inner driver
            // unexpectedly shuts down
            this.attachUnexpectedShutdownHandler(d, innerSessionId);

            _logger2['default'].info('New ' + InnerDriver.name + ' session created successfully, session ' + (innerSessionId + ' added to master session list'));

            // set the New Command Timeout for the inner driver
            d.startNewCommandTimeout();

            return context$2$0.abrupt('return', [innerSessionId, dCaps]);

          case 47:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this, [[9, 14], [18, 24], [30,, 39, 43]]);
    }
  }, {
    key: 'attachUnexpectedShutdownHandler',
    value: function attachUnexpectedShutdownHandler(driver, innerSessionId) {
      return _regeneratorRuntime.async(function attachUnexpectedShutdownHandler$(context$2$0) {
        var _this3 = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.prev = 0;
            context$2$0.next = 3;
            return _regeneratorRuntime.awrap(driver.onUnexpectedShutdown);

          case 3:
            throw new Error('Unexpected shutdown');

          case 6:
            context$2$0.prev = 6;
            context$2$0.t0 = context$2$0['catch'](0);

            if (!(context$2$0.t0 instanceof _bluebird2['default'].CancellationError)) {
              context$2$0.next = 10;
              break;
            }

            return context$2$0.abrupt('return');

          case 10:
            _logger2['default'].warn('Closing session, cause was \'' + context$2$0.t0.message + '\'');
            _logger2['default'].info('Removing session ' + innerSessionId + ' from our master session list');
            context$2$0.next = 14;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              delete _this3.sessions[innerSessionId];
            }));

          case 14:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this, [[0, 6]]);
    }
  }, {
    key: 'curSessionDataForDriver',
    value: function curSessionDataForDriver(InnerDriver) {
      var sessions, data, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, datum;

      return _regeneratorRuntime.async(function curSessionDataForDriver$(context$2$0) {
        var _this4 = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.next = 2;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              return _this4.sessions;
            }));

          case 2:
            sessions = context$2$0.sent;
            data = _lodash2['default'].values(sessions).filter(function (s) {
              return s.constructor.name === InnerDriver.name;
            }).map(function (s) {
              return s.driverData;
            });
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            context$2$0.prev = 7;
            _iterator2 = _getIterator(data);

          case 9:
            if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
              context$2$0.next = 16;
              break;
            }

            datum = _step2.value;

            if (datum) {
              context$2$0.next = 13;
              break;
            }

            throw new Error('Problem getting session data for driver type ' + (InnerDriver.name + '; does it implement \'get ') + 'driverData\'?');

          case 13:
            _iteratorNormalCompletion2 = true;
            context$2$0.next = 9;
            break;

          case 16:
            context$2$0.next = 22;
            break;

          case 18:
            context$2$0.prev = 18;
            context$2$0.t0 = context$2$0['catch'](7);
            _didIteratorError2 = true;
            _iteratorError2 = context$2$0.t0;

          case 22:
            context$2$0.prev = 22;
            context$2$0.prev = 23;

            if (!_iteratorNormalCompletion2 && _iterator2['return']) {
              _iterator2['return']();
            }

          case 25:
            context$2$0.prev = 25;

            if (!_didIteratorError2) {
              context$2$0.next = 28;
              break;
            }

            throw _iteratorError2;

          case 28:
            return context$2$0.finish(25);

          case 29:
            return context$2$0.finish(22);

          case 30:
            return context$2$0.abrupt('return', data);

          case 31:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this, [[7, 18, 22, 30], [23,, 25, 29]]);
    }
  }, {
    key: 'deleteSession',
    value: function deleteSession(sessionId) {
      var otherSessionsData, dstSession;
      return _regeneratorRuntime.async(function deleteSession$(context$2$0) {
        var _this5 = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            context$2$0.prev = 0;
            otherSessionsData = null;
            dstSession = null;
            context$2$0.next = 5;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              if (!_this5.sessions[sessionId]) {
                return;
              }
              var curConstructorName = _this5.sessions[sessionId].constructor.name;
              otherSessionsData = _lodash2['default'].toPairs(_this5.sessions).filter(function (_ref4) {
                var _ref42 = _slicedToArray(_ref4, 2);

                var key = _ref42[0];
                var value = _ref42[1];
                return value.constructor.name === curConstructorName && key !== sessionId;
              }).map(function (_ref5) {
                var _ref52 = _slicedToArray(_ref5, 2);

                var value = _ref52[1];
                return value.driverData;
              });
              dstSession = _this5.sessions[sessionId];
              _logger2['default'].info('Removing session ' + sessionId + ' from our master session list');
              // regardless of whether the deleteSession completes successfully or not
              // make the session unavailable, because who knows what state it might
              // be in otherwise
              delete _this5.sessions[sessionId];
            }));

          case 5:
            context$2$0.next = 7;
            return _regeneratorRuntime.awrap(dstSession.deleteSession(sessionId, otherSessionsData));

          case 7:
            context$2$0.next = 13;
            break;

          case 9:
            context$2$0.prev = 9;
            context$2$0.t0 = context$2$0['catch'](0);

            _logger2['default'].error('Had trouble ending session ' + sessionId + ': ' + context$2$0.t0.message);
            throw context$2$0.t0;

          case 13:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this, [[0, 9]]);
    }
  }, {
    key: 'executeCommand',
    value: function executeCommand(cmd) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var _get2, sessionId, dstSession;

      return _regeneratorRuntime.async(function executeCommand$(context$2$0) {
        var _this6 = this;

        while (1) switch (context$2$0.prev = context$2$0.next) {
          case 0:
            if (!(cmd === 'getStatus')) {
              context$2$0.next = 4;
              break;
            }

            context$2$0.next = 3;
            return _regeneratorRuntime.awrap(this.getStatus());

          case 3:
            return context$2$0.abrupt('return', context$2$0.sent);

          case 4:
            if (!isAppiumDriverCommand(cmd)) {
              context$2$0.next = 6;
              break;
            }

            return context$2$0.abrupt('return', (_get2 = _get(Object.getPrototypeOf(AppiumDriver.prototype), 'executeCommand', this)).call.apply(_get2, [this, cmd].concat(args)));

          case 6:
            sessionId = _lodash2['default'].last(args);
            context$2$0.next = 9;
            return _regeneratorRuntime.awrap(sessionsListGuard.acquire(AppiumDriver.name, function () {
              return _this6.sessions[sessionId];
            }));

          case 9:
            dstSession = context$2$0.sent;

            if (dstSession) {
              context$2$0.next = 12;
              break;
            }

            throw new Error('The session with id \'' + sessionId + '\' does not exist');

          case 12:
            return context$2$0.abrupt('return', dstSession.executeCommand.apply(dstSession, [cmd].concat(args)));

          case 13:
          case 'end':
            return context$2$0.stop();
        }
      }, null, this);
    }
  }, {
    key: 'proxyActive',
    value: function proxyActive(sessionId) {
      var dstSession = this.sessions[sessionId];
      return dstSession && _lodash2['default'].isFunction(dstSession.proxyActive) && dstSession.proxyActive(sessionId);
    }
  }, {
    key: 'getProxyAvoidList',
    value: function getProxyAvoidList(sessionId) {
      var dstSession = this.sessions[sessionId];
      return dstSession ? dstSession.getProxyAvoidList() : [];
    }
  }, {
    key: 'canProxy',
    value: function canProxy(sessionId) {
      var dstSession = this.sessions[sessionId];
      return dstSession && dstSession.canProxy(sessionId);
    }
  }, {
    key: 'isCommandsQueueEnabled',
    get: function get() {
      return false;
    }
  }]);

  return AppiumDriver;
})(_appiumBaseDriver.BaseDriver);

function isAppiumDriverCommand(cmd) {
  return !(0, _appiumBaseDriver.isSessionCommand)(cmd) || cmd === "deleteSession";
}

function getAppiumRouter(args) {
  var appium = new AppiumDriver(args);
  return (0, _appiumBaseDriver.routeConfiguringFunction)(appium);
}

exports.AppiumDriver = AppiumDriver;
exports.getAppiumRouter = getAppiumRouter;
exports['default'] = getAppiumRouter;

// Remove the session on unexpected shutdown, so that we are in a position
// to open another session later on.
// TODO: this should be removed and replaced by a onShutdown callback.
// this is a cancellable promise
// if we get here, we've had an unexpected shutdown, so error

// if we cancelled the unexpected shutdown promise, that means we
// no longer care about it, and can safely ignore it

// getStatus command should not be put into queue. If we do it as part of super.executeCommand, it will be added to queue.
// There will be lot of status commands in queue during createSession command, as createSession can take up to or more than a minute.
//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzVDLGFBQU8sVUFBVSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQztLQUN6RDs7O1dBRVEsa0JBQUMsU0FBUyxFQUFFO0FBQ25CLFVBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDNUMsYUFBTyxVQUFVLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNyRDs7O1NBdlIwQixlQUFHO0FBQzVCLGFBQU8sS0FBSyxDQUFDO0tBQ2Q7OztTQXpCRyxZQUFZOzs7QUFtVGxCLFNBQVMscUJBQXFCLENBQUUsR0FBRyxFQUFFO0FBQ25DLFNBQU8sQ0FBQyx3Q0FBaUIsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLGVBQWUsQ0FBQztDQUMxRDs7QUFFRCxTQUFTLGVBQWUsQ0FBRSxJQUFJLEVBQUU7QUFDOUIsTUFBSSxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsU0FBTyxnREFBeUIsTUFBTSxDQUFDLENBQUM7Q0FDekM7O1FBRVEsWUFBWSxHQUFaLFlBQVk7UUFBRSxlQUFlLEdBQWYsZUFBZTtxQkFDdkIsZUFBZSIsImZpbGUiOiJsaWIvYXBwaXVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2cgZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgZ2V0QXBwaXVtQ29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgQmFzZURyaXZlciwgcm91dGVDb25maWd1cmluZ0Z1bmN0aW9uLCBlcnJvcnMsXG4gICAgICAgICBpc1Nlc3Npb25Db21tYW5kIH0gZnJvbSAnYXBwaXVtLWJhc2UtZHJpdmVyJztcbmltcG9ydCB7IEZha2VEcml2ZXIgfSBmcm9tICdhcHBpdW0tZmFrZS1kcml2ZXInO1xuaW1wb3J0IHsgQW5kcm9pZERyaXZlciB9IGZyb20gJ2FwcGl1bS1hbmRyb2lkLWRyaXZlcic7XG5pbXBvcnQgeyBJb3NEcml2ZXIgfSBmcm9tICdhcHBpdW0taW9zLWRyaXZlcic7XG5pbXBvcnQgeyBBbmRyb2lkVWlhdXRvbWF0b3IyRHJpdmVyIH0gZnJvbSAnYXBwaXVtLXVpYXV0b21hdG9yMi1kcml2ZXInO1xuaW1wb3J0IHsgU2VsZW5kcm9pZERyaXZlciB9IGZyb20gJ2FwcGl1bS1zZWxlbmRyb2lkLWRyaXZlcic7XG5pbXBvcnQgeyBYQ1VJVGVzdERyaXZlciB9IGZyb20gJ2FwcGl1bS14Y3VpdGVzdC1kcml2ZXInO1xuaW1wb3J0IHsgWW91aUVuZ2luZURyaXZlciB9IGZyb20gJ2FwcGl1bS15b3VpZW5naW5lLWRyaXZlcic7XG5pbXBvcnQgeyBXaW5kb3dzRHJpdmVyIH0gZnJvbSAnYXBwaXVtLXdpbmRvd3MtZHJpdmVyJztcbmltcG9ydCB7IE1hY0RyaXZlciB9IGZyb20gJ2FwcGl1bS1tYWMtZHJpdmVyJztcbmltcG9ydCB7IEVzcHJlc3NvRHJpdmVyIH0gZnJvbSAnYXBwaXVtLWVzcHJlc3NvLWRyaXZlcic7XG5pbXBvcnQgQiBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBBc3luY0xvY2sgZnJvbSAnYXN5bmMtbG9jayc7XG5cblxuY29uc3Qgc2Vzc2lvbnNMaXN0R3VhcmQgPSBuZXcgQXN5bmNMb2NrKCk7XG5jb25zdCBwZW5kaW5nRHJpdmVyc0d1YXJkID0gbmV3IEFzeW5jTG9jaygpO1xuXG5jbGFzcyBBcHBpdW1Ecml2ZXIgZXh0ZW5kcyBCYXNlRHJpdmVyIHtcbiAgY29uc3RydWN0b3IgKGFyZ3MpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgLy8gdGhlIG1haW4gQXBwaXVtIERyaXZlciBoYXMgbm8gbmV3IGNvbW1hbmQgdGltZW91dFxuICAgIHRoaXMubmV3Q29tbWFuZFRpbWVvdXRNcyA9IDA7XG5cbiAgICB0aGlzLmFyZ3MgPSBhcmdzO1xuXG4gICAgLy8gQWNjZXNzIHRvIHNlc3Npb25zIGxpc3QgbXVzdCBiZSBndWFyZGVkIHdpdGggYSBTZW1hcGhvcmUsIGJlY2F1c2VcbiAgICAvLyBpdCBtaWdodCBiZSBjaGFuZ2VkIGJ5IG90aGVyIGFzeW5jIGNhbGxzIGF0IGFueSB0aW1lXG4gICAgLy8gSXQgaXMgbm90IHJlY29tbWVuZGVkIHRvIGFjY2VzcyB0aGlzIHByb3BlcnR5IGRpcmVjdGx5IGZyb20gdGhlIG91dHNpZGVcbiAgICB0aGlzLnNlc3Npb25zID0ge307XG5cbiAgICAvLyBBY2Nlc3MgdG8gcGVuZGluZyBkcml2ZXJzIGxpc3QgbXVzdCBiZSBndWFyZGVkIHdpdGggYSBTZW1hcGhvcmUsIGJlY2F1c2VcbiAgICAvLyBpdCBtaWdodCBiZSBjaGFuZ2VkIGJ5IG90aGVyIGFzeW5jIGNhbGxzIGF0IGFueSB0aW1lXG4gICAgLy8gSXQgaXMgbm90IHJlY29tbWVuZGVkIHRvIGFjY2VzcyB0aGlzIHByb3BlcnR5IGRpcmVjdGx5IGZyb20gdGhlIG91dHNpZGVcbiAgICB0aGlzLnBlbmRpbmdEcml2ZXJzID0ge307XG4gIH1cblxuICAvKipcbiAgICogQ2FuY2VsIGNvbW1hbmRzIHF1ZXVlaW5nIGZvciB0aGUgdW1icmVsbGEgQXBwaXVtIGRyaXZlclxuICAgKi9cbiAgZ2V0IGlzQ29tbWFuZHNRdWV1ZUVuYWJsZWQgKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHNlc3Npb25FeGlzdHMgKHNlc3Npb25JZCkge1xuICAgIGNvbnN0IGRzdFNlc3Npb24gPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgcmV0dXJuIGRzdFNlc3Npb24gJiYgZHN0U2Vzc2lvbi5zZXNzaW9uSWQgIT09IG51bGw7XG4gIH1cblxuICBkcml2ZXJGb3JTZXNzaW9uIChzZXNzaW9uSWQpIHtcbiAgICByZXR1cm4gdGhpcy5zZXNzaW9uc1tzZXNzaW9uSWRdO1xuICB9XG5cbiAgZ2V0RHJpdmVyRm9yQ2FwcyAoY2Fwcykge1xuICAgIC8vIFRPRE8gaWYgdGhpcyBsb2dpYyBldmVyIGJlY29tZXMgY29tcGxleCwgc2hvdWxkIHByb2JhYmx5IGZhY3RvciBvdXRcbiAgICAvLyBpbnRvIGl0cyBvd24gZmlsZVxuICAgIGlmICghY2Fwcy5wbGF0Zm9ybU5hbWUgfHwgIV8uaXNTdHJpbmcoY2Fwcy5wbGF0Zm9ybU5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBpbmNsdWRlIGEgcGxhdGZvcm1OYW1lIGNhcGFiaWxpdHlcIik7XG4gICAgfVxuXG4gICAgLy8gd2UgZG9uJ3QgbmVjZXNzYXJpbHkgaGF2ZSBhbiBgYXV0b21hdGlvbk5hbWVgIGNhcGFiaWxpdHksXG4gICAgaWYgKGNhcHMuYXV0b21hdGlvbk5hbWUpIHtcbiAgICAgIGlmIChjYXBzLmF1dG9tYXRpb25OYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzZWxlbmRyb2lkJykge1xuICAgICAgICAvLyBidXQgaWYgd2UgZG8gYW5kIGl0IGlzICdTZWxlbmRyb2lkJywgYWN0IG9uIGl0XG4gICAgICAgIHJldHVybiBTZWxlbmRyb2lkRHJpdmVyO1xuICAgICAgfSBlbHNlIGlmIChjYXBzLmF1dG9tYXRpb25OYW1lLnRvTG93ZXJDYXNlKCkgPT09ICd1aWF1dG9tYXRvcjInKSB7XG4gICAgICAgIC8vIGJ1dCBpZiB3ZSBkbyBhbmQgaXQgaXMgJ1VpYXV0b21hdG9yMicsIGFjdCBvbiBpdFxuICAgICAgICByZXR1cm4gQW5kcm9pZFVpYXV0b21hdG9yMkRyaXZlcjtcbiAgICAgIH0gZWxzZSBpZiAoY2Fwcy5hdXRvbWF0aW9uTmFtZS50b0xvd2VyQ2FzZSgpID09PSAneGN1aXRlc3QnKSB7XG4gICAgICAgIC8vIGJ1dCBpZiB3ZSBkbyBhbmQgaXQgaXMgJ1hDVUlUZXN0JywgYWN0IG9uIGl0XG4gICAgICAgIHJldHVybiBYQ1VJVGVzdERyaXZlcjtcbiAgICAgIH0gZWxzZSBpZiAoY2Fwcy5hdXRvbWF0aW9uTmFtZS50b0xvd2VyQ2FzZSgpID09PSAneW91aWVuZ2luZScpIHtcbiAgICAgICAgLy8gYnV0IGlmIHdlIGRvIGFuZCBpdCBpcyAnWW91aUVuZ2luZScsIGFjdCBvbiBpdFxuICAgICAgICByZXR1cm4gWW91aUVuZ2luZURyaXZlcjtcbiAgICAgIH0gZWxzZSBpZiAoY2Fwcy5hdXRvbWF0aW9uTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnZXNwcmVzc28nKSB7XG4gICAgICAgIGxvZy53YXJuKCdUaGUgQXBwaXVtIEVzcHJlc3NvIGRyaXZlciBpcyBjdXJyZW50bHkgaW4gZWFybHkgYmV0YSBhbmQgbWVhbnQgb25seSBmb3IgZXhwZXJpbWVudGFsIHVzYWdlLiBJdHMgQVBJIGlzIG5vdCB5ZXQgY29tcGxldGUgb3IgZ3VhcmFudGVlZCB0byB3b3JrLiBQbGVhc2UgcmVwb3J0IGJ1Z3MgdG8gdGhlIEFwcGl1bSB0ZWFtIG9uIEdpdEh1Yi4nKTtcbiAgICAgICAgcmV0dXJuIEVzcHJlc3NvRHJpdmVyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjYXBzLnBsYXRmb3JtTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImZha2VcIikge1xuICAgICAgcmV0dXJuIEZha2VEcml2ZXI7XG4gICAgfVxuXG4gICAgaWYgKGNhcHMucGxhdGZvcm1OYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdhbmRyb2lkJykge1xuICAgICAgcmV0dXJuIEFuZHJvaWREcml2ZXI7XG4gICAgfVxuXG4gICAgaWYgKGNhcHMucGxhdGZvcm1OYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdpb3MnKSB7XG4gICAgICBpZiAoY2Fwcy5wbGF0Zm9ybVZlcnNpb24pIHtcbiAgICAgICAgbGV0IG1ham9yVmVyID0gY2Fwcy5wbGF0Zm9ybVZlcnNpb24udG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMF07XG4gICAgICAgIGlmIChwYXJzZUludChtYWpvclZlciwgMTApID49IDEwKSB7XG4gICAgICAgICAgbG9nLmluZm8oXCJSZXF1ZXN0ZWQgaU9TIHN1cHBvcnQgd2l0aCB2ZXJzaW9uID49IDEwLCB1c2luZyBYQ1VJVGVzdCBcIiArXG4gICAgICAgICAgICAgICAgICAgXCJkcml2ZXIgaW5zdGVhZCBvZiBVSUF1dG9tYXRpb24tYmFzZWQgZHJpdmVyLCBzaW5jZSB0aGUgXCIgK1xuICAgICAgICAgICAgICAgICAgIFwibGF0dGVyIGlzIHVuc3VwcG9ydGVkIG9uIGlPUyAxMCBhbmQgdXAuXCIpO1xuICAgICAgICAgIHJldHVybiBYQ1VJVGVzdERyaXZlcjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gSW9zRHJpdmVyO1xuICAgIH1cblxuICAgIGlmIChjYXBzLnBsYXRmb3JtTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnd2luZG93cycpIHtcbiAgICAgIHJldHVybiBXaW5kb3dzRHJpdmVyO1xuICAgIH1cblxuICAgIGlmIChjYXBzLnBsYXRmb3JtTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnbWFjJykge1xuICAgICAgcmV0dXJuIE1hY0RyaXZlcjtcbiAgICB9XG5cbiAgICBsZXQgbXNnO1xuICAgIGlmIChjYXBzLmF1dG9tYXRpb25OYW1lKSB7XG4gICAgICBtc2cgPSBgQ291bGQgbm90IGZpbmQgYSBkcml2ZXIgZm9yIGF1dG9tYXRpb25OYW1lICcke2NhcHMuYXV0b21hdGlvbk5hbWV9JyBhbmQgcGxhdGZvcm1OYW1lIGAgK1xuICAgICAgICAgICAgYCcke2NhcHMucGxhdGZvcm1OYW1lfScuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgbXNnID0gYENvdWxkIG5vdCBmaW5kIGEgZHJpdmVyIGZvciBwbGF0Zm9ybU5hbWUgJyR7Y2Fwcy5wbGF0Zm9ybU5hbWV9Jy5gO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bXNnfSBQbGVhc2UgY2hlY2sgeW91ciBkZXNpcmVkIGNhcGFiaWxpdGllcy5gKTtcbiAgfVxuXG4gIGdldERyaXZlclZlcnNpb24gKGRyaXZlcikge1xuICAgIGNvbnN0IE5BTUVfRFJJVkVSX01BUCA9IHtcbiAgICAgIFNlbGVuZHJvaWREcml2ZXI6ICdhcHBpdW0tc2VsZW5kcm9pZC1kcml2ZXInLFxuICAgICAgQW5kcm9pZFVpYXV0b21hdG9yMkRyaXZlcjogJ2FwcGl1bS11aWF1dG9tYXRvcjItZHJpdmVyJyxcbiAgICAgIFhDVUlUZXN0RHJpdmVyOiAnYXBwaXVtLXhjdWl0ZXN0LWRyaXZlcicsXG4gICAgICBZb3VpRW5naW5lRHJpdmVyOiAnYXBwaXVtLXlvdWllbmdpbmUtZHJpdmVyJyxcbiAgICAgIEZha2VEcml2ZXI6ICdhcHBpdW0tZmFrZS1kcml2ZXInLFxuICAgICAgQW5kcm9pZERyaXZlcjogJ2FwcGl1bS1hbmRyb2lkLWRyaXZlcicsXG4gICAgICBJb3NEcml2ZXI6ICdhcHBpdW0taW9zLWRyaXZlcicsXG4gICAgICBXaW5kb3dzRHJpdmVyOiAnYXBwaXVtLXdpbmRvd3MtZHJpdmVyJyxcbiAgICAgIE1hY0RyaXZlcjogJ2FwcGl1bS1tYWMtZHJpdmVyJyxcbiAgICB9O1xuICAgIGlmICghTkFNRV9EUklWRVJfTUFQW2RyaXZlci5uYW1lXSkge1xuICAgICAgbG9nLndhcm4oYFVuYWJsZSB0byBnZXQgdmVyc2lvbiBvZiBkcml2ZXIgJyR7ZHJpdmVyLm5hbWV9J2ApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQge3ZlcnNpb259ID0gcmVxdWlyZShgJHtOQU1FX0RSSVZFUl9NQVBbZHJpdmVyLm5hbWVdfS9wYWNrYWdlLmpzb25gKTtcbiAgICByZXR1cm4gdmVyc2lvbjtcbiAgfVxuXG4gIGFzeW5jIGdldFN0YXR1cyAoKSB7XG4gICAgbGV0IGNvbmZpZyA9IGF3YWl0IGdldEFwcGl1bUNvbmZpZygpO1xuICAgIGxldCBnaXRTaGEgPSBjb25maWdbJ2dpdC1zaGEnXTtcbiAgICBsZXQgc3RhdHVzID0ge2J1aWxkOiB7dmVyc2lvbjogY29uZmlnLnZlcnNpb259fTtcbiAgICBpZiAodHlwZW9mIGdpdFNoYSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgc3RhdHVzLmJ1aWxkLnJldmlzaW9uID0gZ2l0U2hhO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdHVzO1xuICB9XG5cbiAgYXN5bmMgZ2V0U2Vzc2lvbnMgKCkge1xuICAgIGNvbnN0IHNlc3Npb25zID0gYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4gdGhpcy5zZXNzaW9ucyk7XG4gICAgcmV0dXJuIF8udG9QYWlycyhzZXNzaW9ucylcbiAgICAgICAgLm1hcCgoW2lkLCBkcml2ZXJdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHtpZCwgY2FwYWJpbGl0aWVzOiBkcml2ZXIuY2Fwc307XG4gICAgICAgIH0pO1xuICB9XG5cbiAgcHJpbnROZXdTZXNzaW9uQW5ub3VuY2VtZW50IChkcml2ZXIsIGNhcHMpIHtcbiAgICBsZXQgZHJpdmVyVmVyc2lvbiA9IHRoaXMuZ2V0RHJpdmVyVmVyc2lvbihkcml2ZXIpO1xuICAgIGxldCBpbnRyb1N0cmluZyA9IGRyaXZlclZlcnNpb24gP1xuICAgICAgYENyZWF0aW5nIG5ldyAke2RyaXZlci5uYW1lfSAodiR7ZHJpdmVyVmVyc2lvbn0pIHNlc3Npb25gIDpcbiAgICAgIGBDcmVhdGluZyBuZXcgJHtkcml2ZXIubmFtZX0gc2Vzc2lvbmA7XG4gICAgbG9nLmluZm8oaW50cm9TdHJpbmcpO1xuICAgIGxvZy5pbmZvKCdDYXBhYmlsaXRpZXM6Jyk7XG4gICAgdXRpbC5pbnNwZWN0KGNhcHMpO1xuICAgIGZvciAobGV0IFtjYXAsIHZhbHVlXSBvZiBfLnRvUGFpcnMoY2FwcykpIHtcbiAgICAgIGxvZy5pbmZvKGAgICR7Y2FwfTogJHt1dGlsLmluc3BlY3QodmFsdWUpfWApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVNlc3Npb24gKGNhcHMsIHJlcUNhcHMpIHtcbiAgICBjYXBzID0gXy5kZWZhdWx0cyhfLmNsb25lKGNhcHMpLCB0aGlzLmFyZ3MuZGVmYXVsdENhcGFiaWxpdGllcyk7XG4gICAgbGV0IElubmVyRHJpdmVyID0gdGhpcy5nZXREcml2ZXJGb3JDYXBzKGNhcHMpO1xuICAgIHRoaXMucHJpbnROZXdTZXNzaW9uQW5ub3VuY2VtZW50KElubmVyRHJpdmVyLCBjYXBzKTtcblxuICAgIGlmICh0aGlzLmFyZ3Muc2Vzc2lvbk92ZXJyaWRlKSB7XG4gICAgICBjb25zdCBzZXNzaW9uSWRzVG9EZWxldGUgPSBhd2FpdCBzZXNzaW9uc0xpc3RHdWFyZC5hY3F1aXJlKEFwcGl1bURyaXZlci5uYW1lLCAoKSA9PiBfLmtleXModGhpcy5zZXNzaW9ucykpO1xuICAgICAgaWYgKHNlc3Npb25JZHNUb0RlbGV0ZS5sZW5ndGgpIHtcbiAgICAgICAgbG9nLmluZm8oYFNlc3Npb24gb3ZlcnJpZGUgaXMgb24uIERlbGV0aW5nIG90aGVyICR7c2Vzc2lvbklkc1RvRGVsZXRlLmxlbmd0aH0gYWN0aXZlIHNlc3Npb24ke3Nlc3Npb25JZHNUb0RlbGV0ZS5sZW5ndGggPyAnJyA6ICdzJ30uYCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgQi5tYXAoc2Vzc2lvbklkc1RvRGVsZXRlLCAoaWQpID0+IHRoaXMuZGVsZXRlU2Vzc2lvbihpZCkpO1xuICAgICAgICB9IGNhdGNoIChpZ24pIHt9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHJ1bm5pbmdEcml2ZXJzRGF0YSwgb3RoZXJQZW5kaW5nRHJpdmVyc0RhdGE7XG4gICAgbGV0IGQgPSBuZXcgSW5uZXJEcml2ZXIodGhpcy5hcmdzKTtcbiAgICB0cnkge1xuICAgICAgcnVubmluZ0RyaXZlcnNEYXRhID0gYXdhaXQgdGhpcy5jdXJTZXNzaW9uRGF0YUZvckRyaXZlcihJbm5lckRyaXZlcik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IGVycm9ycy5TZXNzaW9uTm90Q3JlYXRlZEVycm9yKGUubWVzc2FnZSk7XG4gICAgfVxuICAgIGF3YWl0IHBlbmRpbmdEcml2ZXJzR3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgdGhpcy5wZW5kaW5nRHJpdmVyc1tJbm5lckRyaXZlci5uYW1lXSA9IHRoaXMucGVuZGluZ0RyaXZlcnNbSW5uZXJEcml2ZXIubmFtZV0gfHwgW107XG4gICAgICBvdGhlclBlbmRpbmdEcml2ZXJzRGF0YSA9IHRoaXMucGVuZGluZ0RyaXZlcnNbSW5uZXJEcml2ZXIubmFtZV0ubWFwKChkcnYpID0+IGRydi5kcml2ZXJEYXRhKTtcbiAgICAgIHRoaXMucGVuZGluZ0RyaXZlcnNbSW5uZXJEcml2ZXIubmFtZV0ucHVzaChkKTtcbiAgICB9KTtcbiAgICBsZXQgaW5uZXJTZXNzaW9uSWQsIGRDYXBzO1xuICAgIHRyeSB7XG4gICAgICBbaW5uZXJTZXNzaW9uSWQsIGRDYXBzXSA9IGF3YWl0IGQuY3JlYXRlU2Vzc2lvbihjYXBzLCByZXFDYXBzLCBbLi4ucnVubmluZ0RyaXZlcnNEYXRhLCAuLi5vdGhlclBlbmRpbmdEcml2ZXJzRGF0YV0pO1xuICAgICAgYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgICB0aGlzLnNlc3Npb25zW2lubmVyU2Vzc2lvbklkXSA9IGQ7XG4gICAgICB9KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgcGVuZGluZ0RyaXZlcnNHdWFyZC5hY3F1aXJlKEFwcGl1bURyaXZlci5uYW1lLCAoKSA9PiB7XG4gICAgICAgIF8ucHVsbCh0aGlzLnBlbmRpbmdEcml2ZXJzW0lubmVyRHJpdmVyLm5hbWVdLCBkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHRoaXMgaXMgYW4gYXN5bmMgZnVuY3Rpb24gYnV0IHdlIGRvbid0IGF3YWl0IGl0IGJlY2F1c2UgaXQgaGFuZGxlc1xuICAgIC8vIGFuIG91dC1vZi1iYW5kIHByb21pc2Ugd2hpY2ggaXMgZnVsZmlsbGVkIGlmIHRoZSBpbm5lciBkcml2ZXJcbiAgICAvLyB1bmV4cGVjdGVkbHkgc2h1dHMgZG93blxuICAgIHRoaXMuYXR0YWNoVW5leHBlY3RlZFNodXRkb3duSGFuZGxlcihkLCBpbm5lclNlc3Npb25JZCk7XG5cblxuICAgIGxvZy5pbmZvKGBOZXcgJHtJbm5lckRyaXZlci5uYW1lfSBzZXNzaW9uIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LCBzZXNzaW9uIGAgK1xuICAgICAgICAgICAgIGAke2lubmVyU2Vzc2lvbklkfSBhZGRlZCB0byBtYXN0ZXIgc2Vzc2lvbiBsaXN0YCk7XG5cbiAgICAvLyBzZXQgdGhlIE5ldyBDb21tYW5kIFRpbWVvdXQgZm9yIHRoZSBpbm5lciBkcml2ZXJcbiAgICBkLnN0YXJ0TmV3Q29tbWFuZFRpbWVvdXQoKTtcblxuICAgIHJldHVybiBbaW5uZXJTZXNzaW9uSWQsIGRDYXBzXTtcbiAgfVxuXG4gIGFzeW5jIGF0dGFjaFVuZXhwZWN0ZWRTaHV0ZG93bkhhbmRsZXIgKGRyaXZlciwgaW5uZXJTZXNzaW9uSWQpIHtcbiAgICAvLyBSZW1vdmUgdGhlIHNlc3Npb24gb24gdW5leHBlY3RlZCBzaHV0ZG93biwgc28gdGhhdCB3ZSBhcmUgaW4gYSBwb3NpdGlvblxuICAgIC8vIHRvIG9wZW4gYW5vdGhlciBzZXNzaW9uIGxhdGVyIG9uLlxuICAgIC8vIFRPRE86IHRoaXMgc2hvdWxkIGJlIHJlbW92ZWQgYW5kIHJlcGxhY2VkIGJ5IGEgb25TaHV0ZG93biBjYWxsYmFjay5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgZHJpdmVyLm9uVW5leHBlY3RlZFNodXRkb3duOyAvLyB0aGlzIGlzIGEgY2FuY2VsbGFibGUgcHJvbWlzZVxuICAgICAgLy8gaWYgd2UgZ2V0IGhlcmUsIHdlJ3ZlIGhhZCBhbiB1bmV4cGVjdGVkIHNodXRkb3duLCBzbyBlcnJvclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHNodXRkb3duJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBCLkNhbmNlbGxhdGlvbkVycm9yKSB7XG4gICAgICAgIC8vIGlmIHdlIGNhbmNlbGxlZCB0aGUgdW5leHBlY3RlZCBzaHV0ZG93biBwcm9taXNlLCB0aGF0IG1lYW5zIHdlXG4gICAgICAgIC8vIG5vIGxvbmdlciBjYXJlIGFib3V0IGl0LCBhbmQgY2FuIHNhZmVseSBpZ25vcmUgaXRcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbG9nLndhcm4oYENsb3Npbmcgc2Vzc2lvbiwgY2F1c2Ugd2FzICcke2UubWVzc2FnZX0nYCk7XG4gICAgICBsb2cuaW5mbyhgUmVtb3Zpbmcgc2Vzc2lvbiAke2lubmVyU2Vzc2lvbklkfSBmcm9tIG91ciBtYXN0ZXIgc2Vzc2lvbiBsaXN0YCk7XG4gICAgICBhd2FpdCBzZXNzaW9uc0xpc3RHdWFyZC5hY3F1aXJlKEFwcGl1bURyaXZlci5uYW1lLCAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlc3Npb25zW2lubmVyU2Vzc2lvbklkXTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGN1clNlc3Npb25EYXRhRm9yRHJpdmVyIChJbm5lckRyaXZlcikge1xuICAgIGNvbnN0IHNlc3Npb25zID0gYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4gdGhpcy5zZXNzaW9ucyk7XG4gICAgY29uc3QgZGF0YSA9IF8udmFsdWVzKHNlc3Npb25zKVxuICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMuY29uc3RydWN0b3IubmFtZSA9PT0gSW5uZXJEcml2ZXIubmFtZSlcbiAgICAgICAgICAgICAgICAgICAubWFwKChzKSA9PiBzLmRyaXZlckRhdGEpO1xuICAgIGZvciAobGV0IGRhdHVtIG9mIGRhdGEpIHtcbiAgICAgIGlmICghZGF0dW0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm9ibGVtIGdldHRpbmcgc2Vzc2lvbiBkYXRhIGZvciBkcml2ZXIgdHlwZSBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke0lubmVyRHJpdmVyLm5hbWV9OyBkb2VzIGl0IGltcGxlbWVudCAnZ2V0IGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgYGRyaXZlckRhdGEnP2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNlc3Npb24gKHNlc3Npb25JZCkge1xuICAgIHRyeSB7XG4gICAgICBsZXQgb3RoZXJTZXNzaW9uc0RhdGEgPSBudWxsO1xuICAgICAgbGV0IGRzdFNlc3Npb24gPSBudWxsO1xuICAgICAgYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjdXJDb25zdHJ1Y3Rvck5hbWUgPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgb3RoZXJTZXNzaW9uc0RhdGEgPSBfLnRvUGFpcnModGhpcy5zZXNzaW9ucylcbiAgICAgICAgICAgICAgLmZpbHRlcigoW2tleSwgdmFsdWVdKSA9PiB2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lID09PSBjdXJDb25zdHJ1Y3Rvck5hbWUgJiYga2V5ICE9PSBzZXNzaW9uSWQpXG4gICAgICAgICAgICAgIC5tYXAoKFssIHZhbHVlXSkgPT4gdmFsdWUuZHJpdmVyRGF0YSk7XG4gICAgICAgIGRzdFNlc3Npb24gPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgICAgIGxvZy5pbmZvKGBSZW1vdmluZyBzZXNzaW9uICR7c2Vzc2lvbklkfSBmcm9tIG91ciBtYXN0ZXIgc2Vzc2lvbiBsaXN0YCk7XG4gICAgICAgIC8vIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgZGVsZXRlU2Vzc2lvbiBjb21wbGV0ZXMgc3VjY2Vzc2Z1bGx5IG9yIG5vdFxuICAgICAgICAvLyBtYWtlIHRoZSBzZXNzaW9uIHVuYXZhaWxhYmxlLCBiZWNhdXNlIHdobyBrbm93cyB3aGF0IHN0YXRlIGl0IG1pZ2h0XG4gICAgICAgIC8vIGJlIGluIG90aGVyd2lzZVxuICAgICAgICBkZWxldGUgdGhpcy5zZXNzaW9uc1tzZXNzaW9uSWRdO1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBkc3RTZXNzaW9uLmRlbGV0ZVNlc3Npb24oc2Vzc2lvbklkLCBvdGhlclNlc3Npb25zRGF0YSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbG9nLmVycm9yKGBIYWQgdHJvdWJsZSBlbmRpbmcgc2Vzc2lvbiAke3Nlc3Npb25JZH06ICR7ZS5tZXNzYWdlfWApO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBleGVjdXRlQ29tbWFuZCAoY21kLCAuLi5hcmdzKSB7XG4gICAgLy8gZ2V0U3RhdHVzIGNvbW1hbmQgc2hvdWxkIG5vdCBiZSBwdXQgaW50byBxdWV1ZS4gSWYgd2UgZG8gaXQgYXMgcGFydCBvZiBzdXBlci5leGVjdXRlQ29tbWFuZCwgaXQgd2lsbCBiZSBhZGRlZCB0byBxdWV1ZS5cbiAgICAvLyBUaGVyZSB3aWxsIGJlIGxvdCBvZiBzdGF0dXMgY29tbWFuZHMgaW4gcXVldWUgZHVyaW5nIGNyZWF0ZVNlc3Npb24gY29tbWFuZCwgYXMgY3JlYXRlU2Vzc2lvbiBjYW4gdGFrZSB1cCB0byBvciBtb3JlIHRoYW4gYSBtaW51dGUuXG4gICAgaWYgKGNtZCA9PT0gJ2dldFN0YXR1cycpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFN0YXR1cygpO1xuICAgIH1cbiAgICBpZiAoaXNBcHBpdW1Ecml2ZXJDb21tYW5kKGNtZCkpIHtcbiAgICAgIHJldHVybiBzdXBlci5leGVjdXRlQ29tbWFuZChjbWQsIC4uLmFyZ3MpO1xuICAgIH1cblxuICAgIGNvbnN0IHNlc3Npb25JZCA9IF8ubGFzdChhcmdzKTtcbiAgICBjb25zdCBkc3RTZXNzaW9uID0gYXdhaXQgc2Vzc2lvbnNMaXN0R3VhcmQuYWNxdWlyZShBcHBpdW1Ecml2ZXIubmFtZSwgKCkgPT4gdGhpcy5zZXNzaW9uc1tzZXNzaW9uSWRdKTtcbiAgICBpZiAoIWRzdFNlc3Npb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHNlc3Npb24gd2l0aCBpZCAnJHtzZXNzaW9uSWR9JyBkb2VzIG5vdCBleGlzdGApO1xuICAgIH1cbiAgICByZXR1cm4gZHN0U2Vzc2lvbi5leGVjdXRlQ29tbWFuZChjbWQsIC4uLmFyZ3MpO1xuICB9XG5cbiAgcHJveHlBY3RpdmUgKHNlc3Npb25JZCkge1xuICAgIGNvbnN0IGRzdFNlc3Npb24gPSB0aGlzLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgcmV0dXJuIGRzdFNlc3Npb24gJiYgXy5pc0Z1bmN0aW9uKGRzdFNlc3Npb24ucHJveHlBY3RpdmUpICYmIGRzdFNlc3Npb24ucHJveHlBY3RpdmUoc2Vzc2lvbklkKTtcbiAgfVxuXG4gIGdldFByb3h5QXZvaWRMaXN0IChzZXNzaW9uSWQpIHtcbiAgICBjb25zdCBkc3RTZXNzaW9uID0gdGhpcy5zZXNzaW9uc1tzZXNzaW9uSWRdO1xuICAgIHJldHVybiBkc3RTZXNzaW9uID8gZHN0U2Vzc2lvbi5nZXRQcm94eUF2b2lkTGlzdCgpIDogW107XG4gIH1cblxuICBjYW5Qcm94eSAoc2Vzc2lvbklkKSB7XG4gICAgY29uc3QgZHN0U2Vzc2lvbiA9IHRoaXMuc2Vzc2lvbnNbc2Vzc2lvbklkXTtcbiAgICByZXR1cm4gZHN0U2Vzc2lvbiAmJiBkc3RTZXNzaW9uLmNhblByb3h5KHNlc3Npb25JZCk7XG4gIH1cbn1cblxuLy8gaGVscCBkZWNpZGUgd2hpY2ggY29tbWFuZHMgc2hvdWxkIGJlIHByb3hpZWQgdG8gc3ViLWRyaXZlcnMgYW5kIHdoaWNoXG4vLyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGlzLCBvdXIgdW1icmVsbGEgZHJpdmVyXG5mdW5jdGlvbiBpc0FwcGl1bURyaXZlckNvbW1hbmQgKGNtZCkge1xuICByZXR1cm4gIWlzU2Vzc2lvbkNvbW1hbmQoY21kKSB8fCBjbWQgPT09IFwiZGVsZXRlU2Vzc2lvblwiO1xufVxuXG5mdW5jdGlvbiBnZXRBcHBpdW1Sb3V0ZXIgKGFyZ3MpIHtcbiAgbGV0IGFwcGl1bSA9IG5ldyBBcHBpdW1Ecml2ZXIoYXJncyk7XG4gIHJldHVybiByb3V0ZUNvbmZpZ3VyaW5nRnVuY3Rpb24oYXBwaXVtKTtcbn1cblxuZXhwb3J0IHsgQXBwaXVtRHJpdmVyLCBnZXRBcHBpdW1Sb3V0ZXIgfTtcbmV4cG9ydCBkZWZhdWx0IGdldEFwcGl1bVJvdXRlcjtcbiJdLCJzb3VyY2VSb290IjoiLi4vLi4ifQ==
