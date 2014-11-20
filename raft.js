var server = require('./raft/server')
var Simulator = require('./raft_sim/simulator')

var raft = {};

raft.buildCluster = function(options) {
  var clusterSize = options.clusterSize;
  return new Simulator(raft._range(clusterSize).map(function(index) {
    return new Server(index + 1, 'follower', null, options);
  }));
};

raft._range = function(to) {
  return Array.apply(null, Array(to)).map(function (_, i) {return i;});
}

raft.Server = server.Server;

module.exports = raft;
