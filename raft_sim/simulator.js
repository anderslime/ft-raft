Simulator = (function() {
  function Simulator(servers) {
    this.servers = servers;
    this._updatePeersOnServers(servers);
  };

  Simulator.prototype.crash = function(serverId) {
    this._serverWithId(serverId) && this._serverWithId(serverId).crash();
  };

  Simulator.prototype.restart = function(serverId) {
    this._serverWithId(serverId) && this._serverWithId(serverId).restart();
  };

  Simulator.prototype.appendEntry = function(serverId, value) {
    return this._serverWithId(serverId) && this._serverWithId(serverId).onReceiveClientRequest({
      "value": value
    });
  };

  Simulator.prototype._serverWithId = function(serverId) {
    return this.servers[serverId - 1]
  };

  Simulator.prototype._updatePeersOnServers = function(servers) {
    for (serverIndex in this.servers) {
      for (otherServerIndex in this.servers) {
        this._addPeerToServer(serverIndex, otherServerIndex);
      }
    }
  };

  Simulator.prototype._addPeerToServer = function(peerSourceIndex, peerTargetIndex) {
    if (peerSourceIndex === peerTargetIndex) return;
    this.servers[peerSourceIndex].addPeer(this.servers[peerTargetIndex]);
  };

  return Simulator;
})();

module.exports = Simulator;
