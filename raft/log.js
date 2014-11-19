Log = (function() {
  function Log(logEntries) {
    this.logEntries = logEntries || [];
  };

  Log.prototype.append = function(logEntry) {
    if (Array.isArray(logEntry)) {
      this._appendLogEntries(logEntry);
    } else {
      this.logEntries.push(logEntry);
    }
  };

  Log.prototype.entryAt = function(index) {
    return this.logEntries[index - 1];
  };

  Log.prototype.lastEntry = function() {
    return this.entryAt(this.lastIndex())
  };

  Log.prototype.lastIndex = function() {
    return this.logEntries.length;
  };

  Log.prototype.deleteLogEntriesFollowingAndIncluding = function(logIndex) {
    var realIndex = logIndex - 1;
    this.logEntries.splice(realIndex, this.logEntries.length - realIndex);
  };

  Log.prototype.length = function() {
    return this.logEntries.length;
  };

  Log.prototype.entryRange = function(fromIndex, toIndex) {
    return this.logEntries.slice(fromIndex - 1, toIndex - 1);
  };

  Log.prototype.isAtLeastUpToDateAs = function(logIndex, logTerm) {
    return this.lastIndex() <= logIndex && this.lastLogTerm() <= logTerm;
  };

  Log.prototype.lastLogTerm = function() {
    if (this.logEntries.length === 0) return 0;
    return this.lastEntry().term;
  };

  Log.prototype._appendLogEntries = function(newLogEntries) {
    for (var logEntryIndex in newLogEntries) {
      this.logEntries.push(newLogEntries[logEntryIndex])
    }
  };

  return Log;
})();

module.exports = Log;
