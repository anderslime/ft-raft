DirectAsync = (function() {
  function DirectAsync(cluster, options) {
    if (options === undefined) options = {};
    this.cluster = cluster;
    this.minRPCDelay = options.minRPCDelay || 10;
    this.maxRPCDelay = options.maxRPCDelay || 20;
  };

  DirectAsync.prototype.invokeVoteRequest = function(sourcePeerId, targetPeerId, requestVote) {
    var targetPeer = this.cluster.findPeer(targetPeerId);
    return this._delayed(function() {
      return targetPeer.onReceiveRequestVote(sourcePeerId, requestVote);
    });
  };

  DirectAsync.prototype.invokeVoteResponse = function(sourcePeerId, voteResponse) {
    var sourcePeer = this.cluster.findPeer(sourcePeerId);
    return this._delayed(function() {
      return sourcePeer.invokeVoteResponse(voteResponse);
    });
  };

  DirectAsync.prototype.invokeAppendEntries = function(sourcePeerId, targetPeerId, appendEntry) {
    var targetPeer = this.cluster.findPeer(targetPeerId);
    return this._delayed(function() {
      return targetPeer.onReceiveAppendEntries(sourcePeerId, appendEntry);
    });
  };

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

  return DirectAsync;
})();

module.exports = DirectAsync;