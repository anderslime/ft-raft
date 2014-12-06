/**
 * Extraction of state that is unique to the leader Server.
 * @constructor
 * @param {Array} otherPeers - List of other Server objects in the cluster.
 * @param {number} lastLogIndex - The last log index when the server became leader.
 */
function LeaderState(otherPeers, lastLogIndex){
  this.lastLogIndex = lastLogIndex;
  this.nextIndex = this._initialNextIndex(otherPeers, lastLogIndex);
  this.matchIndex = this._initialMatchIndex(otherPeers);
};

/**
* @returns the nextIndexFor the peer with the given id
* @param {number} peerId - The id of the peer to return next index for.
*/
LeaderState.prototype.nextIndexFor = function(peerId) {
  if (this.nextIndex[peerId] === undefined) return this.lastLogIndex + 1;
  return this.nextIndex[peerId];
};

/**
* Decrements the next index for the peer with the given peerId
* @param {number} peerId - The id of the peer to decrement next index for.
*/
LeaderState.prototype.decrementNextIndex = function(peerId) {
  this.nextIndex[peerId] = this.nextIndexFor(peerId) - 1;
};

/**
* Set next log index for the given peer
* @param {number} peerId - The id of the peer to set next index for.
* @param {number} nextIndex - The index to set as next log index for the given peer.
*/
LeaderState.prototype.setNextIndex = function(peerId, nextIndex) {
  this.nextIndex[peerId] = nextIndex;
};

/**
* Set match index for the given peer.
* @param {number} peerId - The id of the peer to set match index for.
* @param {number} matchedIndex - The index to set as matching index for the given peer.
*/
LeaderState.prototype.setMatchIndex = function(peerId, matchedIndex) {
  this.matchIndex[peerId] = matchedIndex;
};

/**
* @returns the matching index for given peer.
* @param {number} peerId - The id of the peer to return match index for.
*/
LeaderState.prototype.matchIndexFor = function(peerId) {
  var matchIndex = this.matchIndex[peerId];
  if (matchIndex === undefined) return -1;
  return matchIndex;
};

LeaderState.prototype._initialNextIndex = function(otherPeers, lastLogIndex) {
  var initialNextIndex = [];
  otherPeers.forEach(function(peer) {
    initialNextIndex[peer.id] = lastLogIndex + 1;
  });
  return initialNextIndex;
};

LeaderState.prototype._initialMatchIndex = function(otherPeers) {
  var initialMatchIndex = [];
  otherPeers.forEach(function(peer) {
    initialMatchIndex[peer.id] = 0;
  });
  return initialMatchIndex;
};

module.exports = LeaderState;
