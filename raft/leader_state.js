LeaderState = ( function(){
	function LeaderState(lastLogIndex){
		this.lastLogIndex = lastLogIndex;
		this.nextIndex = [];
	};

	LeaderState.prototype.nextIndexFor = function(peerIndex) {
		console.log(this)
		return this.nextIndex[peerIndex] || (this.lastLogIndex + 1);
	};


	return LeaderState;

})();

module.exports = LeaderState;