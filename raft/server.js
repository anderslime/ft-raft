var raft = {};

Server = (function() {
  function Server(index, peers) {
    this.index = index;
    this.peers = peers;
  };

  return Server;

})();

module.exports = Server;
