var Log = require('./log');
var Cluster = require('./cluster');
var LeaderState = require('./leader_state');
var DirectAsync = require('./protocol/direct');

DEFAULT_HEARTBEAT_DELAY = 100;
DEFAULT_ELECTION_TIMER_INTERVAL = [1500, 3000];

Server = (function() {
  /**
   * The Server is the root object representing a Server in the cluster.
   * @constructor
   * @param {number} id - The id of the server
   * @param {string} state - The initial state of the server ('leader', 'follower' or 'candindate')
   * @param {Log} log - The initial log of the server.
   * @param {object} options - Optional parameters to control Server
   */
  function Server(id, state, log, options) {
    if (options === undefined) options = {};
    this.heartbeatDelay = options.heartbeatDelay || DEFAULT_HEARTBEAT_DELAY
    this.electionTimerInterval = options.electionTimerInterval || DEFAULT_ELECTION_TIMER_INTERVAL
    this.protocol = options.protocol || new Direct();
    this.clock_interval
    this.id = id;
    this.cluster = new Cluster([this]);
    this.protocol.cluster = this.cluster;
    this.state = state || 'follower';
    this.log = log || new Log();
    this.currentTerm = 0;
    this.commitIndex = 0;
    this.votedFor = null;
    this.leaderState = new LeaderState(this._otherPeers(), this._lastLogIndex());
    this.electionTimeoutMilSec = null;
    this._resetElectionTimer();
    this.isDown = false;
    var _me = this;
    this.electionTimer = setInterval(function() {
      _me._decrementElectionTimeout(1);
    }, 1);
    this.votes = [];
  };

  /**
  * @param {number} peerId - The id of the peer.
  * @returns the next index in the log of the given peer
  */
  Server.prototype.nextIndexFor = function(peerId) {
    return this.leaderState.nextIndexFor(peerId);
  };

  /**
  * @param {number} peerId - The id of the peer.
  * @returns the lowest index that matches with the given peer
  */
  Server.prototype.matchIndexFor = function(peerId) {
    return this.leaderState.matchIndexFor(peerId);
  };

  /**
  * Simulates the server is crashed.
  */
  Server.prototype.crash = function() {
    this._becomeFollower();
    this.isDown = true;
  };

  /**
  * Simulates the server is restarted and functional again.
  */
  Server.prototype.restart = function() {
    this._resetElectionTimer();
    this.isDown = false;
  }

  /**
  * Method for handling a received request from the Raft client.
  *
  * @param {object} logEntry - An object with value and term.
  * @returns a response to the client with indication whether the request
  *   is successful and if not an id of the leader. leaderId is undefined if
  *   there is no current leader.
  */
  Server.prototype.onReceiveClientRequest = function(logEntry) {
    if (this.isDown) return;
    if (this.isLeader()) {
      this.log.append({"value": logEntry.value, "term": this.currentTerm});
      return {
        "isSuccessful": true,
        "leaderId": this.id
      }
    } else {
      return {
        "isSuccessful": false,
        "leaderId": this.cluster.leaderId()
      }
    }
  };

  /**
  * @returns the last entry of the log.
  */
  Server.prototype.lastLogEntry = function() {
    return this.log.lastEntry();
  };

  /**
  * Adds a peer to the server's local registry of other servers in the cluster.
  */
  Server.prototype.addPeer = function(server){
    this.cluster.addPeer(server);
  };

  /**
  * @returns true if the server is leader, else false.
  */
  Server.prototype.isLeader = function() {
    return this.state == 'leader';
  };

  /**
  * Method for handling a timeout.
  * If the server is not down or is a leader it will become a candidate and
  * start a new election.
  */
  Server.prototype.onTimeout = function(){
    if (this.isLeader() || this.isDown) return;
    this._becomeCandidate();
    this._startElection();
  };

  /**
  * Send a vote request to a given peer.
  * Invokes a VoteRequestRPC on the given targetPeer through the protocol with
  * the id and a VoteRequestRPC object.
  * @param {Server} targetPeer - The Server of the peer that should receive the vote.
  * @returns a result of the invoked VoteRequestRPC
  */
  Server.prototype.invokeVoteRequest = function(targetPeer) {
    if (this.isDown) return;
    return this.protocol.invokeVoteRequest(
      this.id,
      targetPeer.id,
      {
        "term": this.currentTerm,
        "candidateId": this.id,
        "lastLogIndex": this._lastLogIndex(),
        "lastLogTerm": this._lastLogTerm()
      }
    )
  };

  /**
  * Method for handling a RequestVoteRPC.
  * If it is not down and the vote is seen as valid, it will grant the vote
  * and set to vote for the requesting candidate. If the vote is not valid
  * it will not grant the vote.
  * @param {number} sourcePeerId - The id of the candidate Server
  * @param {object} requestVote - The RequestVoteRPC object.
  * @returns a result from invoking the vote response through the protocol.
  */
  Server.prototype.onReceiveRequestVote = function(sourcePeerId, requestVote) {
    this._onRemoteProcedureCall(requestVote);
    if (this.isDown) return;
    var _me = this;
    if (_me._isValidVote(requestVote)) {
      _me._voteFor(requestVote.candidateId);
      return this.protocol.invokeVoteResponse(
        sourcePeerId,
        { "term": requestVote.term, "voteGranted": true }
      );
    } else {
      return this.protocol.invokeVoteResponse(
        sourcePeerId,
        { "term": _me.currentTerm, "voteGranted": false }
      );
    }
  };

  /**
  * Method for handling an AppendEntriesRPC.
  *
  * If it is not down it will:
  *   - Reset vote
  *   - Reset election timer
  *   - Become follower
  *   - Delete inconsistent log entries compared to leader
  *   - Append the entries given in the AppendEntriesRPC
  *   - Return response result to the leader
  *
  * @param {number} sourcePeerId - The id of the leader invoking AppendEntriesRPC
  * @param {object} appendEntries - The AppendEntriesRPC object.
  * @returns the result of invoking a response to the leader through the protocol
  */
  Server.prototype.onReceiveAppendEntries = function(sourcePeerId, appendEntries) {
    this._onRemoteProcedureCall(appendEntries);
    if (this.isDown) return;
    this.votedFor = null;
    this._resetElectionTimer();
    this.state = "follower";
    if (!this._containsLogEntryWithSameTerm(appendEntries)) {
      this._deleteLogEntriesFollowingAndIncluding(appendEntries.prevLogIndex);
    }
    this.log.append(appendEntries.entries);
    if (appendEntries.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(appendEntries.leaderCommit, this._lastLogIndex());
    }
    return this.protocol.invokeAppendEntriesResponse(
      sourcePeerId,
      this.id,
      {
        "term": this.currentTerm,
        "success": this._appendEntriesSuccessResult(appendEntries),
        "matchIndex": this.log.lastIndex()
      }
    );
  };

  /**
  * Handles resopnse from a RequestVoteRPC.
  * If it is not the leader or is down it will become leader if the given
  * vote results in the server having the majority of votes.
  */
  Server.prototype.invokeVoteResponse = function(requestVoteResult) {
    this._onRemoteProcedureCall(requestVoteResult);
    if (this.isDown || this.isLeader()) return;
    this.votes.push(requestVoteResult);
    this._becomeLeaderIfMajorityOfVotesReceived(this.votes);
    return requestVoteResult;
  };

  /**
  * Handle response from an AppendEntriesRPC request.
  * If it is not down and:
  *   - the ApendEntriesRPC is successful:
  *     - it will set the matchindex and nextindex for the given peer
  *   - the AppendEntriesRPC is not successful:
  *     - it will decrement the next index for the given peer
  * @param {number} targetPeerid - The server id of the peer originally receiving the RequestVoteRPC.
  * @param {object} appendEntriesResult - The result of the RequestVoteRPC.
  * @returns a result of the invoked VoteRequestRPC
  */
  Server.prototype.invokeAppendEntriesResponse = function(targetPeerId, appendEntriesResult) {
    this._onRemoteProcedureCall(appendEntriesResult);
    if (this.isDown) return;
    if(appendEntriesResult.success){
      var matchIndex = Math.max(
        this.leaderState.matchIndexFor(targetPeerId),
        appendEntriesResult.matchIndex
      );
      this.leaderState.setMatchIndex(targetPeerId, matchIndex);
      this.leaderState.setNextIndex(targetPeerId, matchIndex + 1);
    } else {
      this.leaderState.decrementNextIndex(targetPeerId);
    }
    this._advanceCommitIndex();
    return appendEntriesResult;
  };

  /**
  * Invoke AppendEntriesRPC on the given peer.
  * If it is leader and is not down it will send the RPC with relevant data
  * for the given peer to be in consensus.
  * @param {number} targetPeerId - The id of the peer that should receive the AppendEntriesRPC
  * @returns a result from invoking the AppendEntriesRPC through the protocol.
  */
  Server.prototype.invokeAppendEntries = function(targetPeerId) {
    if (this.isDown || !this.isLeader()) return;
    var prevLogIndex = this.leaderState.nextIndexFor(targetPeerId) - 1;
    return this.protocol.invokeAppendEntries(
      this.id,
      targetPeerId,
      {
        "term": this.currentTerm,
        "leaderId": this.id,
        "prevLogIndex": prevLogIndex,
        "prevLogTerm": this._termAtLogEntry(prevLogIndex),
        "entries": this._entries(targetPeerId),
        "leaderCommit": this.commitIndex
      }
    )
  };


  Server.prototype._termAtLogEntry = function(entryIndex) {
    if (entryIndex === 0 || this.log.entryAt(entryIndex) === undefined) return null;
    return this.log.entryAt(entryIndex).term
  };

  Server.prototype._entries = function(targetPeerId) {
    if (this._lastLogIndex() >= this.leaderState.nextIndexFor(targetPeerId)) {
      return this.log.entryRange(
        this.leaderState.nextIndexFor(targetPeerId),
        this._lastLogIndex() + 1
      );
    } else {
      return [];
    }
  };

  Server.prototype._lastLogIndex = function() {
    return this.log.lastIndex();
  };

  Server.prototype._deleteLogEntriesFollowingAndIncluding = function(logIndex) {
    this.log.deleteLogEntriesFollowingAndIncluding(logIndex);
  };

  // Rules for Servers: If RPC request or response contains term T > currentTerm:
  // set currentTerm = T, convert to follower
  Server.prototype._onRemoteProcedureCall = function(rpc) {
    if (rpc.term > this.currentTerm) {
      this.currentTerm = rpc.term;
      this.votedFor = null;
      this._becomeFollower();
    }
  };

  Server.prototype._isValidVote = function(requestVote) {
    return requestVote.term >= this.currentTerm &&
      (this.votedFor === null || this.votedFor === requestVote.candidateId) &&
      this._isLogAtLeastUpToDateAsRequestVote(requestVote);
  };

  Server.prototype._isLogAtLeastUpToDateAsRequestVote = function(requestVote) {
    return this.log.isAtLeastUpToDateAs(
      requestVote.lastLogIndex,
      requestVote.lastLogTerm
    );
  };

  Server.prototype._lastLogTerm = function() {
    return this.log.lastLogTerm();
  };

  Server.prototype._hasGrantedMajorityOfVotes = function(positiveVotes) {
    serversOwnVote = (this.votedFor == this.id) ? 1 : 0;
    var totalVotes = positiveVotes.length + serversOwnVote;
    return this.cluster.isLargerThanMajority(totalVotes);
  };

  Server.prototype._startElection = function() {
    this.votes = [];
    this.currentTerm += 1;
    this.votedFor = this.id;
    this._resetElectionTimer();
    var _me = this;
    this._collectVotesFromOtherPeers();
  };

  Server.prototype._resetElectionTimer = function() {
    this.electionTimeoutMilSec = this._randomNumberBetween(
      this.electionTimerInterval[0],
      this.electionTimerInterval[1]
    )
  };

  Server.prototype._randomNumberBetween = function(min, max) {
    return Math.floor((Math.random() * (max - min)) + min)
  }

  Server.prototype._becomeLeaderIfMajorityOfVotesReceived = function(voteResponses) {
    positiveVotes = voteResponses.filter(function(voteResponse) {
      return voteResponse && voteResponse.voteGranted;
    });
    if (this._hasGrantedMajorityOfVotes(positiveVotes)) {
      this._becomeLeader();
    }
  };

  Server.prototype._collectVotesFromOtherPeers = function() {
    var _me = this;
    return this._otherPeers().map(function(peer) {
      return _me.invokeVoteRequest(peer);
    });
  };

  Server.prototype._otherPeers = function() {
    var _me = this;
    return this.cluster.peers.filter(function(peer) {
      return peer.id !== _me.id;
    });
  };

  Server.prototype._voteFor = function(candidateId) {
    this.votedFor = candidateId;
    this._resetElectionTimer();
  };

  Server.prototype._becomeCandidate = function() {
    this.state = 'candidate';
  };

  Server.prototype._becomeFollower = function() {
    this.state = 'follower';
  };

  Server.prototype._becomeLeader = function() {
    if (this.isLeader()) return;
    this.state = 'leader';
    this.votedFor = null;
    this.leaderState = new LeaderState(this._otherPeers(), this._lastLogIndex());
    this._invokeAppendEntriesOnPeers();
    var _me = this;
    this.heartBeat = setInterval(function() {
      _me._invokeAppendEntriesOnPeers();
    }, this.heartbeatDelay);
  };

   Server.prototype._invokeAppendEntriesOnPeers = function() {
     var _me = this;
     this._otherPeers().map(function(peer) {
       _me.invokeAppendEntries(peer.id);
     });
   };

  Server.prototype._advanceCommitIndex = function() {
    if (!this.isLeader()) return;
    var clusterMatchIndexes = this.leaderState.matchIndex.filter(function(matchIndex) {
      return matchIndex !== undefined;
    }).concat(this._lastLogIndex()).sort();
    var N = clusterMatchIndexes[Math.ceil(this.cluster.amountOfPeers() / 2)];
    if (this.log.entryAt(N) && this.log.entryAt(N).term === this.currentTerm) {
      this.commitIndex = N;
    }
  };

  Server.prototype._decrementElectionTimeout = function(milliSeconds) {
    if (this.isLeader()) return;
    this.electionTimeoutMilSec = this.electionTimeoutMilSec - milliSeconds;
    if (this.electionTimeoutMilSec <= 0) {
      this.onTimeout();
    }
  };

  Server.prototype._appendEntriesSuccessResult = function(appendEntries) {
    return !(appendEntries.term < this.currentTerm) &&
            this._containsLogEntryWithSameTerm(appendEntries);
  };

  Server.prototype._containsLogEntryWithSameTerm = function(appendEntries) {
    return (appendEntries.prevLogIndex === 0) ||
           (this.log.entryAt(appendEntries.prevLogIndex) !== undefined &&
            this.log.entryAt(appendEntries.prevLogIndex).term === appendEntries.prevLogTerm);
  };

  return Server;

})();

module.exports = Server;
