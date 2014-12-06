/**
 * A protocol for communicating between Raft Server objects that
 * uses direct object communication. This can e.g. be used for testing to
 * avoid delay
 * @constructor
 * @param {Cluster} cluster - The Cluster handling other peers
 */
function Direct(cluster) {
  this.cluster = cluster;
};

/**
 * Delegates a VoteRequestRPC from source to target server.
 * @param {number} sourcePeerId - The id of the server the request comes from.
 * @param {number} targetPeerId - The id of the server the request is send to.
 * @param {object} requestVote - The requestVote object.
 * @returns the result from the request vote handler invoked on the target peer.
 */
Direct.prototype.invokeVoteRequest = function(sourcePeerId, targetPeerId, requestVote) {
  var targetPeer = this.cluster.findPeer(targetPeerId);
  return targetPeer.onReceiveRequestVote(sourcePeerId, requestVote);
};

/**
 * Delegates a VoteRequestRPC response to the source peer.
 * @param {number} sourcePeerId - The id of the server the request originally comes from.
 * @param {object} voteResponse - The response of the original RequestVoteRPC.
 * @returns the result from the response vote handler invoked on the source peer.
 */
Direct.prototype.invokeVoteResponse = function(sourcePeerId, voteResponse) {
  var sourcePeer = this.cluster.findPeer(sourcePeerId);
  return sourcePeer.invokeVoteResponse(voteResponse);
};

/**
 * Delegates an AppendEntriesRPC from source to target server.
 * @param {number} sourcePeerId - The id of the server the request comes from.
 * @param {number} targetPeerId - The id of the server the request is send to.
 * @param {object} appendEntry - The appendEntry object.
 * @returns the result from the append entries handler invoked on the target peer.
 */
Direct.prototype.invokeAppendEntries = function(sourcePeerId, targetPeerId, appendEntry) {
  var targetPeer = this.cluster.findPeer(targetPeerId);
  return targetPeer.onReceiveAppendEntries(sourcePeerId, appendEntry);
};

/**
 * Delegates an AppendEntriesRPC from source to target server.
 * @param {number} sourcePeerId - The id of the server the request originally comes from.
 * @param {number} targetPeerId - The id of the server responding to the RPC.
 * @param {object} appendEntryResponse - The response of the original AppendEntriesRPC.
 * @returns the result from the append entries response handler invoked on the source peer.
 */
Direct.prototype.invokeAppendEntriesResponse = function(sourcePeerId, targetPeerId, appendEntryResponse) {
  var sourcePeer = this.cluster.findPeer(sourcePeerId);
  return sourcePeer.invokeAppendEntriesResponse(targetPeerId, appendEntryResponse)
};

module.exports = Direct;
