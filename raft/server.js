Server = (function() {
  function Server(index, peers, state) {
    this.index = index;
    this.peers = peers;
    this.state = state || 'follower';
  };

  Server.prototype.becomeLeader = function() {
    this.state = 'leader';
  };

  Server.prototype.startElection = function() {
    this.state = 'candidate';
  };

  return Server;

})();

module.exports = Server;
