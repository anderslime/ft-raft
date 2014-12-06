/**
 * The Cluster is responsible for the network of peers.
 * @constructor
 * @param {Array} peers - List of Server objects with other peers.
 */
function Cluster(peers) {
  this.peers = peers || [];
};

/**
* Adds a peer to the server list of other peers in the Raft cluster.
* @param {Server} server - The Server to be added as peer
*/
Cluster.prototype.addPeer = function(server){
  this.peers.push(server);
};

/**
* @returns the id of the leader of the Raft cluster.
*/
Cluster.prototype.leaderId = function() {
  var leader = this.leader();
  return leader && leader.id;
};

/**
* @returns the leader of the Raft cluster.
*/
Cluster.prototype.leader = function() {
  var leader = {};
  for (peerIndex in this.peers) {
    var peer = this.peers[peerIndex];
    if (peer.isLeader()) {
      leader = peer;
    }
  }
  return leader;
};

/**
* @param {number} peerId - The id of the peer to find.
* @returns the Server object of the peer with the given peerId.
*/
Cluster.prototype.findPeer = function(peerId) {
  var peer = {};
  for (var peerIndex in this.peers) {
    var nextPeer = this.peers[peerIndex];
    if (nextPeer.id === peerId) {
      peer = nextPeer;
    }
  }
  return peer;
};

/**
* Can tell if a given number is larger than or equal to the majority number
* of servers in the cluster.
*
* Example:
* If there are 5 servers in the cluster
* isLargerThanMajority(4) == true
* isLargerThanMajority(3) == true
* isLargerThanMajority(2) == false
* @returns true if the given number 'amount' is larger or equal than the
* majority size of servers in the cluster, else false.
*/
Cluster.prototype.isLargerThanMajority = function(amount) {
  return amount >= this._peerMajoritySize();
};

/**
* @returns the amount of peers in the Raft cluster.
*/
Cluster.prototype.amountOfPeers = function() {
  return this.peers.length;
};

Cluster.prototype._peerMajoritySize = function() {
  if (this._hasEventNumberOfPeers()) {
    return this.amountOfPeers() / 2 + 1;
  } else {
    return Math.ceil(this.amountOfPeers() / 2);
  }
};

Cluster.prototype._hasEventNumberOfPeers = function() {
  return this.amountOfPeers() % 2 == 0;
};

module.exports = Cluster;
