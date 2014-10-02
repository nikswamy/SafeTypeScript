# TypeScript

Scalable JavaScript development with types, classes and modules.

## Install

  npm install -g typescript

## Usage

  tsc hello.ts
  

## Build

1.  Install Node if you haven't already (http://nodejs.org/)
2.  Install Jake, the tool we use to build our compiler (https://github.com/mde/jake). To do this, run "npm install -g jake".
3.  To use jake, run one of the following commands: 
    - jake local - This builds the compiler. The output is in built/local in the public directory 
    - jake clean - deletes the build compiler 
    - jake LKG - This replaces the LKG (last known good) version of the compiler with the built one.
        - This is a bootstrapping step to be executed whenever the built compiler reaches a stable state.
    - jake tests - This builds the test infrastructure, using the built compiler. 
    - jake runtests - This runs the tests, using the built compiler and built test infrastructure. 
        - You can also override the host or specify a test for this command. Use host=<hostName> or tests=<testPath>. 
    - jake baseline-accept - This replaces the baseline test results with the results obtained from jake runtests. 
    - jake -T lists the above commands. 

## Added by N. Swamy
## To experiment with the --safe mode, see the Makefile in samples/tsstar, specifically bench safe targets
## To bootstrap the compiler in --safe mode

1. make safe
   Should produce built/local/tsc.safe.js

2. make safe.boot
   Uses built/local/tsc.safe.js to generate built/local/tsc.boot.safe.js
   If these two files are identical, you have successfully bootstrapped Safer TypeScript
