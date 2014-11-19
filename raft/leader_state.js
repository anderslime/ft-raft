LeaderState = ( function(){
  function LeaderState(lastLogIndex){
    this.lastLogIndex = lastLogIndex;
    this.nextIndex = [];
    this.matchIndex = [];
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


  return LeaderState;

})();

module.exports = LeaderState;
