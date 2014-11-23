LeaderState = ( function(){
  function LeaderState(otherPeers, lastLogIndex){
    this.lastLogIndex = lastLogIndex;
    this.nextIndex = this._initialNextIndex(otherPeers, lastLogIndex);
    this.matchIndex = this._initialMatchIndex(otherPeers);
  };

  LeaderState.prototype.nextIndexFor = function(peerIndex) {
    if (this.nextIndex[peerIndex] === undefined) return this.lastLogIndex + 1;
    return this.nextIndex[peerIndex];
  };

  LeaderState.prototype.decrementNextIndex = function(peerIndex) {
    this.nextIndex[peerIndex] = this.nextIndexFor(peerIndex) - 1;
  };

  LeaderState.prototype.incrementNextIndex = function(peerIndex) {
    this.nextIndex[peerIndex] = this.nextIndexFor(peerIndex) + 1;
  };

  LeaderState.prototype.setNextIndex = function(peerIndex, nextIndex) {
    this.nextIndex[peerIndex] = nextIndex;
  };

  LeaderState.prototype.setMatchIndex = function(peerIndex, matchedIndex) {
    this.matchIndex[peerIndex] = matchedIndex;
  };

  LeaderState.prototype.matchIndexFor = function(peerIndex) {
    var matchIndex = this.matchIndex[peerIndex];
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

  return LeaderState;

})();

module.exports = LeaderState;
