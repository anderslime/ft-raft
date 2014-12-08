var Server = require('./raft/server')
var DirectAsync = require('./raft/protocol/direct_async')
var Simulator = require('./raft_sim/simulator')

var raft = {};

raft.buildCluster = function(options) {
  var clusterSize = options.clusterSize;
  return new Simulator(raft._range(clusterSize).map(function(index) {
    options.protocol = options.protocol || new DirectAsync(null, options);
    return new Server(index + 1, 'follower', null, options);
  }));
};

raft.buildClusterWithLeader = function(options) {
  var clusterSize = options.clusterSize;
  var simulator = new Simulator(raft._range(clusterSize).map(function(index) {
    options.protocol = options.protocol || new DirectAsync(null, options);
    return new Server(index + 1, 'follower', null, options);
  }));
  simulator.servers[0]._becomeLeader();
  return simulator;
};

raft._range = function(to) {
  return Array.apply(null, Array(to)).map(function (_, i) {return i;});
}

module.exports = raft;
