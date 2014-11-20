# Raft implementation project for DTU course Fault-Tolerant Systems

This project is an example implementation to learn and evaluate the Raft consensus algorithm.

Team members: Anders Nielsen (s103457) and Joachim Friis (s093256)

## Setup

To get up and running easily, install node and type:

```
npm -g install
```

which will install the dependencies given in `package.json` and setup CLI (Command Line Integration) for setting up a Raft Server and control it with a client.

## Usage

The project consists of a raft simulator with CLI tools for visualizing and manipulating with the simulation.

### Server

To start the server simulation simply type:

```
raftserver
```

This will start the raft simulation and visualize the different servers and their latest log entries.

To see the different possibilities of configure the server, see help by typing:
`raftserver -h`

### Client

To manipulate with the simulation, you can use the `raftclient` command.

To **crash** server with id 3, type:
`raftclient crash 3`

To **restart* server with id 4, type:
`raftclient restart 4`

To **send a request** with the value '1337' to server with id 2, type:
`raftclient request 2 1337`

## Tests

To run the tests in the console., type:

```
mocha
```
