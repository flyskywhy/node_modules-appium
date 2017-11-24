// these are extra unit tests to ensure that appium is set up correctly for publishing

'use strict';

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

var _this = this;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _chai = require('chai');

var _chai2 = _interopRequireDefault(_chai);

var _chaiAsPromised = require('chai-as-promised');

var _chaiAsPromised2 = _interopRequireDefault(_chaiAsPromised);

_chai2['default'].use(_chaiAsPromised2['default']);
var expect = _chai2['default'].expect;

describe.skip('shrinkwrap checks', function () {
  it('shrinkwrap file should exist', function callee$1$0() {
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          require('../../npm-shrinkwrap.json');

        case 1:
        case 'end':
          return context$2$0.stop();
      }
    }, null, _this);
  });

  it('shrinkwrap should not include fsevents', function callee$1$0() {
    var shrinkwrap, message;
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          shrinkwrap = require('../../npm-shrinkwrap.json');

          expect(shrinkwrap.dependencies, 'no shrinkwrap file found. run `npm shrinkwrap`').to.exist;
          _lodash2['default'].values(shrinkwrap.dependencies).length.should.be.above(10);
          message = "'fsevents' entry found in shrinkwrap. It causes problems " + "on non-Mac systems. run `gulp fixShrinkwrap` and try again";

          expect(shrinkwrap.dependencies.fsevents, message).to.not.exist;

        case 5:
        case 'end':
          return context$2$0.stop();
      }
    }, null, _this);
  });
});

// fsevents is an optional dep that only works on Mac.
// if it's in shrinkwrap, non-Mac hosts won't be able to install appium
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3Qvc2hyaW5rd3JhcC1zcGVjcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O3NCQUVjLFFBQVE7Ozs7b0JBQ0wsTUFBTTs7Ozs4QkFDSSxrQkFBa0I7Ozs7QUFHN0Msa0JBQUssR0FBRyw2QkFBZ0IsQ0FBQztBQUN6QixJQUFNLE1BQU0sR0FBRyxrQkFBSyxNQUFNLENBQUM7O0FBRTNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsWUFBTTtBQUN2QyxJQUFFLENBQUMsOEJBQThCLEVBQUU7Ozs7QUFDakMsaUJBQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDOzs7Ozs7O0dBQ3RDLENBQUMsQ0FBQzs7QUFFSCxJQUFFLENBQUMsd0NBQXdDLEVBQUU7UUFHdkMsVUFBVSxFQUdWLE9BQU87Ozs7QUFIUCxvQkFBVSxHQUFHLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQzs7QUFDckQsZ0JBQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLGdEQUFnRCxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQztBQUMzRiw4QkFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN6RCxpQkFBTyxHQUFHLDJEQUEyRCxHQUMzRCw0REFBNEQ7O0FBQzFFLGdCQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7Ozs7Ozs7R0FDaEUsQ0FBQyxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwiZmlsZSI6InRlc3Qvc2hyaW5rd3JhcC1zcGVjcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRoZXNlIGFyZSBleHRyYSB1bml0IHRlc3RzIHRvIGVuc3VyZSB0aGF0IGFwcGl1bSBpcyBzZXQgdXAgY29ycmVjdGx5IGZvciBwdWJsaXNoaW5nXG5cbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgY2hhaSBmcm9tICdjaGFpJztcbmltcG9ydCBjaGFpQXNQcm9taXNlZCBmcm9tICdjaGFpLWFzLXByb21pc2VkJztcblxuXG5jaGFpLnVzZShjaGFpQXNQcm9taXNlZCk7XG5jb25zdCBleHBlY3QgPSBjaGFpLmV4cGVjdDtcblxuZGVzY3JpYmUuc2tpcCgnc2hyaW5rd3JhcCBjaGVja3MnLCAoKSA9PiB7XG4gIGl0KCdzaHJpbmt3cmFwIGZpbGUgc2hvdWxkIGV4aXN0JywgYXN5bmMgKCkgPT4ge1xuICAgIHJlcXVpcmUoJy4uLy4uL25wbS1zaHJpbmt3cmFwLmpzb24nKTtcbiAgfSk7XG5cbiAgaXQoJ3Nocmlua3dyYXAgc2hvdWxkIG5vdCBpbmNsdWRlIGZzZXZlbnRzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIGZzZXZlbnRzIGlzIGFuIG9wdGlvbmFsIGRlcCB0aGF0IG9ubHkgd29ya3Mgb24gTWFjLlxuICAgIC8vIGlmIGl0J3MgaW4gc2hyaW5rd3JhcCwgbm9uLU1hYyBob3N0cyB3b24ndCBiZSBhYmxlIHRvIGluc3RhbGwgYXBwaXVtXG4gICAgbGV0IHNocmlua3dyYXAgPSByZXF1aXJlKCcuLi8uLi9ucG0tc2hyaW5rd3JhcC5qc29uJyk7XG4gICAgZXhwZWN0KHNocmlua3dyYXAuZGVwZW5kZW5jaWVzLCAnbm8gc2hyaW5rd3JhcCBmaWxlIGZvdW5kLiBydW4gYG5wbSBzaHJpbmt3cmFwYCcpLnRvLmV4aXN0O1xuICAgIF8udmFsdWVzKHNocmlua3dyYXAuZGVwZW5kZW5jaWVzKS5sZW5ndGguc2hvdWxkLmJlLmFib3ZlKDEwKTtcbiAgICBsZXQgbWVzc2FnZSA9IFwiJ2ZzZXZlbnRzJyBlbnRyeSBmb3VuZCBpbiBzaHJpbmt3cmFwLiBJdCBjYXVzZXMgcHJvYmxlbXMgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJvbiBub24tTWFjIHN5c3RlbXMuIHJ1biBgZ3VscCBmaXhTaHJpbmt3cmFwYCBhbmQgdHJ5IGFnYWluXCI7XG4gICAgZXhwZWN0KHNocmlua3dyYXAuZGVwZW5kZW5jaWVzLmZzZXZlbnRzLCBtZXNzYWdlKS50by5ub3QuZXhpc3Q7XG4gIH0pO1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii4uLy4uIn0=
