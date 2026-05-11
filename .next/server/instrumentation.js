"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\nasync function register() {\n    if (true) {\n        const { execSync } = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! child_process */ \"child_process\", 23));\n        console.log(\"--- Checking database schema ---\");\n        try {\n            // 1. Ensure schema is up to date\n            execSync(\"npx prisma db push --accept-data-loss\", {\n                stdio: \"inherit\"\n            });\n            // 2. Check if seeding is needed (e.g., if no users exist)\n            // We use a simple script to check user count to avoid loading the whole Prisma client here if possible\n            const userCountStr = execSync(\"npx tsx -e \\\"import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.user.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log(0); process.exit(0); })\\\"\", {\n                encoding: \"utf8\"\n            }).trim();\n            const userCount = parseInt(userCountStr) || 0;\n            if (userCount === 0) {\n                console.log(\"--- Database is empty, seeding... ---\");\n                execSync(\"npm run prisma:seed\", {\n                    stdio: \"inherit\"\n                });\n            }\n            console.log(\"--- Database is ready ---\");\n        } catch (error) {\n            console.error(\"Failed to initialize database:\", error);\n        }\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQU8sZUFBZUE7SUFDcEIsSUFBSUMsSUFBNkIsRUFBVTtRQUN6QyxNQUFNLEVBQUVHLFFBQVEsRUFBRSxHQUFHLE1BQU0sZ0lBQU87UUFDbENDLFFBQVFDLEdBQUcsQ0FBQztRQUNaLElBQUk7WUFDRixpQ0FBaUM7WUFDakNGLFNBQVMseUNBQXlDO2dCQUFFRyxPQUFPO1lBQVU7WUFFckUsMERBQTBEO1lBQzFELHVHQUF1RztZQUN2RyxNQUFNQyxlQUFlSixTQUFTLGdOQUFnTjtnQkFBRUssVUFBVTtZQUFPLEdBQUdDLElBQUk7WUFDeFEsTUFBTUMsWUFBWUMsU0FBU0osaUJBQWlCO1lBRTVDLElBQUlHLGNBQWMsR0FBRztnQkFDbkJOLFFBQVFDLEdBQUcsQ0FBQztnQkFDWkYsU0FBUyx1QkFBdUI7b0JBQUVHLE9BQU87Z0JBQVU7WUFDckQ7WUFFQUYsUUFBUUMsR0FBRyxDQUFDO1FBQ2QsRUFBRSxPQUFPTyxPQUFPO1lBQ2RSLFFBQVFRLEtBQUssQ0FBQyxrQ0FBa0NBO1FBQ2xEO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL3Bvcy8uL3NyYy9pbnN0cnVtZW50YXRpb24udHM/NGZhYiJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgPT09ICdub2RlanMnKSB7XG4gICAgY29uc3QgeyBleGVjU3luYyB9ID0gYXdhaXQgaW1wb3J0KCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgY29uc29sZS5sb2coJy0tLSBDaGVja2luZyBkYXRhYmFzZSBzY2hlbWEgLS0tJyk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIDEuIEVuc3VyZSBzY2hlbWEgaXMgdXAgdG8gZGF0ZVxuICAgICAgZXhlY1N5bmMoJ25weCBwcmlzbWEgZGIgcHVzaCAtLWFjY2VwdC1kYXRhLWxvc3MnLCB7IHN0ZGlvOiAnaW5oZXJpdCcgfSk7XG4gICAgICBcbiAgICAgIC8vIDIuIENoZWNrIGlmIHNlZWRpbmcgaXMgbmVlZGVkIChlLmcuLCBpZiBubyB1c2VycyBleGlzdClcbiAgICAgIC8vIFdlIHVzZSBhIHNpbXBsZSBzY3JpcHQgdG8gY2hlY2sgdXNlciBjb3VudCB0byBhdm9pZCBsb2FkaW5nIHRoZSB3aG9sZSBQcmlzbWEgY2xpZW50IGhlcmUgaWYgcG9zc2libGVcbiAgICAgIGNvbnN0IHVzZXJDb3VudFN0ciA9IGV4ZWNTeW5jKCducHggdHN4IC1lIFwiaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSBcXCdAcHJpc21hL2NsaWVudFxcJzsgY29uc3QgcCA9IG5ldyBQcmlzbWFDbGllbnQoKTsgcC51c2VyLmNvdW50KCkudGhlbihjID0+IHsgY29uc29sZS5sb2coYyk7IHByb2Nlc3MuZXhpdCgwKTsgfSkuY2F0Y2goKCkgPT4geyBjb25zb2xlLmxvZygwKTsgcHJvY2Vzcy5leGl0KDApOyB9KVwiJywgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICAgIGNvbnN0IHVzZXJDb3VudCA9IHBhcnNlSW50KHVzZXJDb3VudFN0cikgfHwgMDtcblxuICAgICAgaWYgKHVzZXJDb3VudCA9PT0gMCkge1xuICAgICAgICBjb25zb2xlLmxvZygnLS0tIERhdGFiYXNlIGlzIGVtcHR5LCBzZWVkaW5nLi4uIC0tLScpO1xuICAgICAgICBleGVjU3luYygnbnBtIHJ1biBwcmlzbWE6c2VlZCcsIHsgc3RkaW86ICdpbmhlcml0JyB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc29sZS5sb2coJy0tLSBEYXRhYmFzZSBpcyByZWFkeSAtLS0nKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgZGF0YWJhc2U6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbInJlZ2lzdGVyIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUlVOVElNRSIsImV4ZWNTeW5jIiwiY29uc29sZSIsImxvZyIsInN0ZGlvIiwidXNlckNvdW50U3RyIiwiZW5jb2RpbmciLCJ0cmltIiwidXNlckNvdW50IiwicGFyc2VJbnQiLCJlcnJvciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();