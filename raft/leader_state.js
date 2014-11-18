LeaderState = ( function(){
	function LeaderState(lastLogIndex){
		this.lastLogIndex = lastLogIndex;
		this.nextIndex = [];
	};

	LeaderState.prototype.nextIndexFor = function(peerIndex) {
		if (this.nextIndex[peerIndex] === undefined) return this.lastLogIndex + 1;
		return this.nextIndex[peerIndex];
	};

	LeaderState.prototype.decrementNextIndex = function(peerIndex) {
		this.nextIndex[peerIndex] = this.nextIndexFor(peerIndex) - 1;
	};


	return LeaderState;

})();

module.exports = LeaderState;