var WS = typeof globalThis !== 'undefined' && globalThis.WebSocket ? globalThis.WebSocket : function WebSocketStub() {};

module.exports = WS;
module.exports.WebSocket = WS;
module.exports.default = WS;
