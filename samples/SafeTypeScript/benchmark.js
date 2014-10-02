var Benchmark = require('benchmark');

var bench = new Benchmark("test",
			  benchmark_fn,
			  {"setup" : setup_fn, "teardown": teardown_fn });

bench.run();
console.log("nsamples: " + bench.stats.sample.length);
console.log("mean: " + bench.stats.mean);
console.log("moe: " + bench.stats.moe);
// console.log("rme: " + bench.stats.rme);
// console.log("std dev: " + bench.stats.deviation);
// console.log("sem: " + bench.stats.sem);
