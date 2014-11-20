var clivas = require('clivas');

Canvas = (function() {
  function Canvas(cluster) {
    this.cluster = cluster;
  };

  Canvas.prototype.startDrawingEvery = function(screenDrawInterval) {
    var _me = this;
    setInterval(function() {
      _me._drawScreen();
    }, screenDrawInterval);
  };

  Canvas.prototype._drawScreen = function() {
    var _me = this;
    clivas.clear();
    this.cluster.servers.map(function(server) {
      clivas.line(_me._serverLine(server));
      clivas.line(_me._logLine(server));
    });
  };

  Canvas.prototype._serverLine = function(server) {
    var votingString = server.votedFor ? " votedFor: " + server.votedFor : "";
    return [
      "Server ",
      server.id,
      " currentTerm: ",
      server.currentTerm,
      " lastLogIndex: ",
      server._lastLogIndex(),
      " ('",
      this._inColor(this._serverColor(server), server.state),
      "'): ",
      server.electionTimeoutMilSec,
      votingString
    ].join("")
  };

  Canvas.prototype._logLine = function(server) {
    puncuations = server.log.length() > 5 ? '... ' : '';
    return "[" + puncuations + server.log.logEntries.slice(-5).map(function(logEntry) {
      return ["v->", logEntry.value,", t->", logEntry.term].join("")
    }).join("], [") + "]"
  };

  Canvas.prototype._inColor = function(color, text) {
    return "{"+color+":"+text+"}";
  };

  Canvas.prototype._serverColor = function(server) {
    if (server.isDown) return 'red';
    if (server.isLeader()) return 'green';
    return 'yellow';
  };

  return Canvas;
})();

module.exports = Canvas;
