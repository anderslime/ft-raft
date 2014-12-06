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
var parseInterval = function(intervalString) {
  return intervalString.split('-').map(function(n) { return parseInt(n) });
};

// Options
DRAW_SCREEN_EVERY_MILLI_SECOND = 100;
DEFAULT_AMOUNT_OF_SERVERS      = 5;
DEFAULT_HEARTBEAT_DELAY        = 100; // ms
DEFAULT_ELECTION_TIMER_INTERVAL = '1500-3000';

var argv = cli.usage("Usage: raftserver [options]")
  .alias('n', 'servers')
    .describe('n', 'number of servers')
    .default('n', 5)
  .alias('b', 'heartbeat-delay')
    .describe('b', 'number of milliseconds between heatbeats')
    .default('b', 200)
  .alias('e', 'election-timer')
    .describe('e', 'election timer interval in milliseconds')
    .default('e', '1500-3000')
  .alias('d', 'rpc-delay')
    .describe('d', "simulated delay between rpc's in milliseconds")
    .default('d', '10-20')
  .alias('h', 'help')
    .describe("h", "See help description")
  .argv;

if (argv.h) {
  cli.showHelp();
  process.exit(0);
}

var options = {
  clusterSize: argv['servers'],
  heartbeatDelay: parseInt(argv['heartbeat-delay']),
  minRPCDelay: parseInterval(argv['rpc-delay'])[0],
  maxRPCDelay: parseInterval(argv['rpc-delay'])[1],
  electionTimerInterval: parseInterval(argv['election-timer'])
};

// Server simulator visualization
var cluster = raft.buildCluster(options);
var canvas = new Canvas(cluster, options);
canvas.startDrawingEvery(DRAW_SCREEN_EVERY_MILLI_SECOND);
command_server.startServer(cluster);
