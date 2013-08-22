/**
 * Generic logging module.
 * 
 * Log Levels:
 * - 3 (Debug)
 * - 2 (Info)
 * - 1 (Warn)
 * - 0 (Error)
 */
var Logger = function (log_level) {
    this._log_level = log_level ? log_level : 2
}

// # Logger.js
// Logger.js is a custom Logging functionality used with node.
// We use the Logger object instead of console.log, to stream out
// the date & time of the logging event to be included.
Logger.prototype = {
    _timestamp: function (msg) {
        return (new Date()).toLocaleString().slice(0, 24);
    },

    // Similar to commercial loggers, we have four levels of logging implemented
    // here, respectively: Debug, Info, Warn, Error; Debug being the last level that
    // can be used to emit out all events.
    debug: function (msg) {
        if (this._log_level < 3) {
            return;
        }
        console.info("[" + this._timestamp() + "] DEBG: " + msg);
    },

    info: function (msg) {
        if (this._log_level < 2) {
            return;
        }
        console.info("[" + this._timestamp() + "] INFO: " + msg);
    },

    warn: function (msg) {
        if (this._log_level < 1) {
            return;
        }
        console.warn("[" + this._timestamp() + "] WARN: " + msg);
    },

    error: function (msg) {
        if (this._log_level < 0) {
            return;
        }
        console.error("[" + this._timestamp() + "] ERRR: " + msg);
    }
}

module.exports = Logger;