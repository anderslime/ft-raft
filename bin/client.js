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
  .demand(2)
  .alias('v', 'value')
    .describe('v', 'value to append to log')
    .default('v', randomValue())
  .argv;

var data = querystring.stringify({
  command: argv._[0],
  serverId: argv._[1],
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

// var postData = {
//   command: argv
// };

// function PostCode(codestring) {
//   // Build the post string from an object
//   var post_data = querystring.stringify({
//       'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
//       'output_format': 'json',
//       'output_info': 'compiled_code',
//         'warning_level' : 'QUIET',
//         'js_code' : codestring
//   });

//   // An object of options to indicate where to post to
//   var post_options = {
//       host: 'closure-compiler.appspot.com',
//       port: '80',
//       path: '/compile',
//       method: 'POST',
//       headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'Content-Length': post_data.length
//       }
//   };

//   // Set up the request
//   var post_req = http.request(post_options, function(res) {
//       res.setEncoding('utf8');
//       res.on('data', function (chunk) {
//           console.log('Response: ' + chunk);
//       });
//   });

//   // post the data
//   post_req.write(post_data);
//   post_req.end();

// }
