Cluster = (function() {
  function Cluster(peers) {
    this.peers = peers || [];
  }

  Cluster.prototype.addPeer = function(server){
    this.peers.push(server);
  }

  Cluster.prototype.leader = function() {
    var leader = {};
    for (peerIndex in this.peers) {
      var peer = this.peers[peerIndex];
      if (peer.isLeader()) {
        leader = peer;
      }
    }
    return leader;
  }

  Cluster.prototype.isLargerThanMajority = function(amount) {
    return amount >= this.peerMajoritySize();
  }

  Cluster.prototype.peerMajoritySize = function() {
    if (this.hasEventNumberOfPeers()) {
      return this.amountOfPeers() / 2 + 1
    } else {
      return Math.ceil(this.amountOfPeers())
    }
  }

  Cluster.prototype.hasEventNumberOfPeers = function() {
    return this.amountOfPeers() % 2 == 0;
  }

  Cluster.prototype.amountOfPeers = function() {
    return this.peers.length;
  }

  return Cluster;
})();

module.exports = Cluster;
