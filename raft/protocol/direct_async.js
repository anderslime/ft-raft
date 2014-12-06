/**
 * A protocol for communicating between Raft Server objects that
 * uses direct object communication, but with a delay simulated with setTimeout.clust
 * @constructor
 * @param {Cluster} cluster - The Cluster handling other peers
 * @param {object} options - An object with options for the delay of the RPC to be simulated.
 */
function DirectAsync(cluster, options) {
  if (options === undefined) options = {};
  this.cluster = cluster;
  this.minRPCDelay = options.minRPCDelay || 10;
  this.maxRPCDelay = options.maxRPCDelay || 20;
};

/**
 * Delegates a VoteRequestRPC from source to target server delayed.
 * @param {number} sourcePeerId - The id of the server the request comes from.
 * @param {number} targetPeerId - The id of the server the request is send to.
 * @param {object} requestVote - The requestVote object.
 * @returns the result from the request vote handler invoked on the target peer.
 */
DirectAsync.prototype.invokeVoteRequest = function(sourcePeerId, targetPeerId, requestVote) {
  var targetPeer = this.cluster.findPeer(targetPeerId);
  return this._delayed(function() {
    return targetPeer.onReceiveRequestVote(sourcePeerId, requestVote);
  });
};

/**
 * Delegates a VoteRequestRPC response to the source peer delayed.
 * @param {number} sourcePeerId - The id of the server the request originally comes from.
 * @param {object} voteResponse - The response of the original RequestVoteRPC.
 * @returns the result from the response vote handler invoked on the source peer.
 */
DirectAsync.prototype.invokeVoteResponse = function(sourcePeerId, voteResponse) {
  var sourcePeer = this.cluster.findPeer(sourcePeerId);
  return this._delayed(function() {
    return sourcePeer.invokeVoteResponse(voteResponse);
  });
};

/**
 * Delegates an AppendEntriesRPC from source to target server delayed.
 * @param {number} sourcePeerId - The id of the server the request comes from.
 * @param {number} targetPeerId - The id of the server the request is send to.
 * @param {object} appendEntry - The appendEntry object.
 * @returns the result from the append entries handler invoked on the target peer.
 */
DirectAsync.prototype.invokeAppendEntries = function(sourcePeerId, targetPeerId, appendEntry) {
  var targetPeer = this.cluster.findPeer(targetPeerId);
  return this._delayed(function() {
    return targetPeer.onReceiveAppendEntries(sourcePeerId, appendEntry);
  });
};

/**
 * Delegates an AppendEntriesRPC from source to target server delayed.
 * @param {number} sourcePeerId - The id of the server the request originally comes from.
 * @param {number} targetPeerId - The id of the server responding to the RPC.
 * @param {object} appendEntryResponse - The response of the original AppendEntriesRPC.
 * @returns the result from the append entries response handler invoked on the source peer.
 */
DirectAsync.prototype.invokeAppendEntriesResponse = function(sourcePeerId, targetPeerId, appendEntryResponse) {
  var sourcePeer = this.cluster.findPeer(sourcePeerId);
  return this._delayed(function() {
    return sourcePeer.invokeAppendEntriesResponse(targetPeerId, appendEntryResponse)
  })
};

DirectAsync.prototype._delayed = function(delayedCallback) {
  return setTimeout(function() {
    return delayedCallback();
  }, this._randomDelay());
};

DirectAsync.prototype._randomDelay = function() {
  return (Math.random() * (this.maxRPCDelay - this.minRPCDelay) + this.maxRPCDelay)
};

module.exports = DirectAsync;
