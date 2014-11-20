Direct = (function() {
  function Direct(cluster) {
    this.cluster = cluster;
  };

  Direct.prototype.invokeVoteRequest = function(sourcePeerId, targetPeerId, requestVote) {
    var targetPeer = this.cluster.findPeer(targetPeerId);
    return targetPeer.onReceiveRequestVote(sourcePeerId, requestVote);
  };

  Direct.prototype.invokeVoteResponse = function(sourcePeerId, voteResponse) {
    var sourcePeer = this.cluster.findPeer(sourcePeerId);
    return sourcePeer.invokeVoteResponse(voteResponse);
  };

  Direct.prototype.invokeAppendEntries = function(sourcePeerId, targetPeerId, appendEntry) {
    var targetPeer = this.cluster.findPeer(targetPeerId);
    return targetPeer.onReceiveAppendEntries(sourcePeerId, appendEntry);
  };

  Direct.prototype.invokeAppendEntriesResponse = function(sourcePeerId, targetPeerId, appendEntryResponse) {
    var sourcePeer = this.cluster.findPeer(sourcePeerId);
    return sourcePeer.invokeAppendEntriesResponse(targetPeerId, appendEntryResponse)
  };

  return Direct;
})();

module.exports = Direct;
