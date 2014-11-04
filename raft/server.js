Server = (function() {
  function Server(index, peers, state) {
    this.index = index;
    this.peers = peers;
    this.state = state || 'follower';
    this.log = [];
  };

  Server.prototype.becomeLeader = function() {
    this.state = 'leader';
  };

  Server.prototype.startElection = function() {
    this.state = 'candidate';
  };

  Server.prototype.onReceiveRequest = function(logEntry) {
    this.log.push(logEntry);
  }

  Server.prototype.lastLogEntry = function() {
    return this.log[this.log.length - 1];
  }

  return Server;

})();

module.exports = Server;
