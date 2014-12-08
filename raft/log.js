/**
 * The log of the Raft Servers implemented as Array.
 * @constructor
 * @param {Array} logEntries - List of initial log entries.
 */
function Log(logEntries) {
  this.logEntries = logEntries || [];
};

/**
 * Appends an entry from the client. This will also assign an index to the entry.
 * @param {object} logEntry - The log entry to be appended
 */
Log.prototype.appendClientEntry = function(logEntry) {
  logEntry.index = this.lastIndex() + 1;
  this.logEntries.push(logEntry);
};

/**
 * Appends a list of entries to the log if they are not already appended.
 * @param {Array} logEntry - An Array of log entries
 */
Log.prototype.appendEntries = function(logEntries) {
  var _me = this;
  logEntries.forEach(function(logEntry) {
    _me.appendEntry(logEntry);
  });
};

/**
 * Appends an entry to the log if it is not already appended.
 * @param {object} logEntry - An array of or single log entry
 */
Log.prototype.appendEntry = function(logEntry) {
  if (logEntry.index > this.lastIndex()) {
    this.logEntries.push(logEntry);
  }
};

/**
 * @returns the log entry at the given index
 */
Log.prototype.entryAt = function(index) {
  return this.logEntries[index - 1];
};

/**
 * @returns the last entry in the log.
 */
Log.prototype.lastEntry = function() {
  return this.entryAt(this.lastIndex())
};

/**
 * @returns the index of the last entry in the log
 */
Log.prototype.lastIndex = function() {
  return this.logEntries.length;
};

/**
 * Deletes log entries following and including entries with logIndex.
 * @param {number} logIndex - The index of the first entry to delete.
 */
Log.prototype.deleteLogEntriesFollowingAndIncluding = function(logIndex) {
  var realIndex = logIndex - 1;
  this.logEntries.splice(realIndex, this.logEntries.length - realIndex);
};

/**
 * @returns the number of log entries in the log.
 */
Log.prototype.length = function() {
  return this.logEntries.length;
};

/**
 * @param {number} fromIndex - The first index of the range
 * @param {number} toIndex - The last index of the range
 * @returns a list of log entries from index 'fromIndex' to 'toIndex'
 */
Log.prototype.entryRange = function(fromIndex, toIndex) {
  return this.logEntries.slice(fromIndex - 1, toIndex - 1);
};

/**
 * @returns true if the log is at least up to date as the given log index and
 * term. This could be the index and term of the comparing log entry.
 */
Log.prototype.isAtLeastUpToDateAs = function(logIndex, logTerm) {
  return this.lastIndex() <= logIndex && this.lastLogTerm() <= logTerm;
};

/**
 * @returns the term of the last log entry.
 */
Log.prototype.lastLogTerm = function() {
  if (this.logEntries.length === 0) return 0;
  return this.lastEntry().term;
};

Log.prototype._appendLogEntries = function(newLogEntries) {
  for (var logEntryIndex in newLogEntries) {
    this.logEntries.push(newLogEntries[logEntryIndex])
  }
};

module.exports = Log;
