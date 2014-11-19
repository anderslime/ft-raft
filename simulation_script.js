var EventEmitter = require("events").EventEmitter;
var raft = require('./raft');
var Canvas = require('./raft_sim/canvas');
var command_server = require('./raft_sim/command_server');

DRAW_SCREEN_EVERY_MILLI_SECOND = 100;

// Server simulator visualization
var cluster = raft.buildCluster(5);
var canvas = new Canvas(cluster);
canvas.startDrawingEvery(DRAW_SCREEN_EVERY_MILLI_SECOND);
command_server.startServer(cluster);
