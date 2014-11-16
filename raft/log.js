Log = (function() {
  function Log(logEntries) {
    this.logEntries = logEntries || [];
  }

  Log.prototype.append = function(logEntry) {
    this.logEntries.push(logEntry);
  }

  Log.prototype.entryAt = function(index) {
    return this.logEntries[index];
  }

  Log.prototype.lastEntry = function() {
    return this.logEntries[this.lastIndex()];
  }

  Log.prototype.lastIndex = function() {
    if (this.logEntries.length === 0) return null;
    return this.logEntries.length - 1;
  }

  Log.prototype.deleteLogEntriesFollowingAndIncluding = function(logIndex) {
    this.logEntries.splice(logIndex, this.logEntries.length - logIndex);
  }

  Log.prototype.length = function() {
    return this.logEntries.length;
  }

  Log.prototype.lastLogTerm = function() {
    if (this.logEntries.length === 0) return 0;
    return this.lastEntry().term;
  }

  return Log;
})();

module.exports = Log;
