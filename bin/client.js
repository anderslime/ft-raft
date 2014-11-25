#!/usr/bin/env node

// Node modules
var http = require('http');
var cli = require('optimist');
var querystring = require('querystring');

// Setup
process.title = 'raft client';

var randomValue = function() {
  var randomValues = ["FT", "XY", "OO", "EX", "TA"];
  return randomValues[parseInt(Math.random() * randomValues.length)];
}

// Options
var argv = cli.usage("Usage: raftclient <command> <server-id>")
  .alias('v', 'value')
    .describe('v', 'value to append to log')
    .default('v', randomValue())
  .argv;

var command = argv._[0];
var serverId = argv._[1];

if (!command || !serverId) {
  console.log("You need to specify <command> and <serverId>");
  console.log("Example: raftclient crash 5")
  console.log();
  console.log("List of commands:");
  console.log("  crash, restart, entry");
  console.log();
  console.log();
  cli.showHelp();
  process.exit(0);
}

var data = querystring.stringify({
  command: command,
  serverId: serverId,
  value: argv.v
});

var request = http.request({
  host: 'localhost',
  port: 8080,
  method: "POST",
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length
  }
}, function(result) {
  result.setEncoding('utf8');
  result.on('data', function(responseData) {
    console.log(responseData);
  });
});

request.write(data);
request.end();
