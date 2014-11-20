#!/usr/bin/env node

// Node modules
var cli = require('optimist');

// Internal modules
var raft = require('../raft');
var Canvas = require('../raft_sim/canvas');
var command_server = require('../raft_sim/command_server');

// Setup
process.title = 'raft';

// Helper methods
var parseElectionTimerInterval = function(intervalString) {
  return intervalString.split('-').map(function(n) { return parseInt(n) });
};

// Options
DRAW_SCREEN_EVERY_MILLI_SECOND = 100;
DEFAULT_AMOUNT_OF_SERVERS      = 5;
DEFAULT_HEARTBEAT_INTERVAL     = 500; // ms
DEFAULT_ELECTION_TIMER_INTERVAL = '1500-3000';

var argv = cli.usage("Usage: raftserver [options]")
  .alias('n', 'servers')
    .describe('n', 'number of servers')
    .default('n', 5)
  .alias('b', 'hearbeat')
    .describe('b', 'number of milli seconds between heatbeats')
    .default('b', 200)
  .alias('e', 'election-timer')
    .describe('e', 'election timer interval in milli seconds')
    .default('e', '1500-3000')
  .alias('h', 'help')
    .describe("h", "See help description")
  .argv;

if (argv.h) {
  cli.showHelp();
  process.exit(0);
}

var options = {
  clusterSize: argv['servers'],
  heartBeatInterval: parseInt(argv['hearbeat']),
  electionTimerInterval: parseElectionTimerInterval(argv['election-timer'])
};



// Server simulator visualization
console.log("------------------ Running Raft ------------------");
console.log("Heartbeat: every " + options.heartBeatInterval + " ms");
console.log(
  "Election timeout: between " +
    options.electionTimerInterval[0] +
    " and " +
    options.electionTimerInterval[1] +
    " ms"
);
console.log("-------------------------------------------------");

var cluster = raft.buildCluster(options);
var canvas = new Canvas(cluster);
canvas.startDrawingEvery(DRAW_SCREEN_EVERY_MILLI_SECOND);
command_server.startServer(cluster);
