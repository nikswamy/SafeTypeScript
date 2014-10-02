SAMPLES=richards.ts richards_typed.ts splay.ts splayTyped.ts raytrace.ts raytraceTyped.ts navier-stokes.ts navier-stokes-typed.ts crypto.ts cryptoTyped.ts
BENCHMARKS=splay splayTyped splayTypedStruct navier-stokes navier-stokes-typed richards richards_typed raytrace raytraceTyped crypto cryptoTyped

benchall: clean $(addsuffix .bench.js, $(BENCHMARKS)) $(addsuffix .benchsafe.js, $(BENCHMARKS)) $(addsuffix .benchsafeopt.js, $(BENCHMARKS)) $(addsuffix .benchweak.js, $(BENCHMARKS)) $(addsuffix .benchtsstar.js, $(BENCHMARKS))

processbm: processbm.js
	node $^

processbm.js: processbm.ts
	tsc --module commonjs $^

wc: 
	wc -l $(SAMPLES)

playground:
	rm $(PGEXAMPLES)/*
	cp $(SAMPLES) $(PGEXAMPLES)

bm: jsonparser richards splay raytrace
	node run-octane.js

raytrace: raytrace.raw.js raytrace.safe.js raytraceTyped.safe.js

splay: splay.raw.js splay.safe.js splayTyped.safe.js

richards: richards.raw.js richards.safe.js richards_typed.raw.js richards_typed.raw.js richards_typed.safe.js

jsonparser: jsonparser.raw.js jsonparser.safe.js jsonparser.sec.js 

hand.%.time: jsonparser.handedit.%.js
	cat $^ testjson.js > $^.test
	time -f '%e secs' node $^.test

old: jsonparser.old.js
	time -f '%e secs' node $^

%.time: jsonparser.%.js
	time -f '%e secs' node $^

%.test.js: %.js testjson.js
	cat $^ >> $@

%.debug.js: ../../../panos/TypeScript/built/local/tsc.js %.ts 
	node $< --target ES5 --debug --out $@ --muteWarnings $*.ts

%.sec.js: %.ts ../../built/local/tsc.js boot.ts %.ts.test
	cat $< | awk 'sub (/VERSION/,"SEC")||1' > tmp.$<
	cat $<.test | awk '{gsub (/VERSION/,"SEC");print}' > tmp.$<.test
	node ../../built/local/tsc.js --target ES5 --secure --out $@ tmp.$<
	echo "var version = 'SEC';" >> $@
	cat tmp.$<.test >> $@

ifeq ($(NOLIB), true)
override OTHERFLAGS=--noLib
endif

mods: 
	node ../../built/local/tsc.js --target ES5 --safe --module commonjs ../node/node.d.ts mods.ts

weakrt: 
	cp ../../src/compiler/typecheck/sound/rtweak.ts rt.ts

stdrt: 
	cp ../../src/compiler/typecheck/sound/rt.ts rt.ts

rtapi.ts: ../../src/compiler/typecheck/sound/rtapi.ts
	cp $^ $@

SAFEMODE_FLAGS=--relaxNullChecks --nowarn 7051 --nowarn 7083  --nowarn 7047 --nowarn 7081 --nowarn 7061 --nowarn 7087 --nowarn 7052 --nowarn 7058 --nowarn 7038 --generics --safe --noGetters

%.js: %.ts ../../built/local/tsc.js ../../built/local/lib.d.ts rtapi.ts stdrt
	node $(PROFILE) ../../built/local/tsc.js $(OTHERFLAGS) -t ES5 -propagateEnumConstants --module commonjs --out $@ $<

%.safe.js: %.ts ../../built/local/tsc.safe.js ../../built/local/lib.d.ts rtapi.ts stdrt
	node $(PROFILE) ../../built/local/tsc.safe.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) -t ES5 -propagateEnumConstants --module commonjs --out $@ $<

%.safeopt.js: %.ts ../../built/local/tsc.js ../../built/local/lib.d.ts rtapi.ts stdrt
	node $(PROFILE) ../../built/local/tsc.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --optimizePure -t ES5 -propagateEnumConstants --module commonjs --out $@ $<

%.weak.js: %.ts ../../built/local/tsc.js ../../built/local/lib.d.ts rtapi.ts weakrt
	node $(PROFILE) ../../built/local/tsc.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --weakMaps -t ES5 -propagateEnumConstants --module commonjs --out $@ $<

%.tsstar.js: %.ts ../../built/local/tsc.js ../../built/local/lib.d.ts rtapi.ts stdrt
	node $(PROFILE) ../../built/local/tsc.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --tsstarTagging  -t ES5 -propagateEnumConstants --module commonjs --out $@ $<

prof: ../../built/local/tsc-safe.js ../../built/local/lib.d.ts rtapi.ts rt.ts  
	node -prof ../../built/local/tsc-safe.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --safe --generics -t ES5 -propagateEnumConstants --module commonjs --out $@ deltablue.ts crypto.ts


%.raw.js: %.ts ../../built/local/tsc.js boot.ts 
	node ../../built/local/tsc.js --target ES5 -propagateEnumConstants --module commonjs --out $@ $<

%.test.js: %.safe.js
	node $^

%.default.js: %.ts ../../built/local/lib.d.ts rt.ts %.ts.test
	node $(PROFILE) ../../bin/tsc.js $(OTHERFLAGS) -t ES5 --module commonjs --out $@ $<

%.bench.js: %.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

%.benchsafe.js: %.safe.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

%.benchsafeopt.js: %.safeopt.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

%.benchweak.js: %.weak.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

%.benchtsstar.js: %.tsstar.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

%.benchdef.js: %.default.js
	cat $< > benchmark.$<
	echo -n >> benchmark.$<
	cat benchmark.js >> benchmark.$<
	node benchmark.$<

profile-safe: 
	node --prof ../../built/local/tsc.js $(OTHERFLAGS) --nowarn 7081 --knownWarnings triage --generics --safe --noRuntimeChecks -t ES5 -removeComments -propagateEnumConstants --module commonjs id.ts micro.ts classes.ts jsonparser.ts richards_typed.ts splayTyped.ts raytraceTyped.ts navier-stokes-typed.ts deltablueTyped.ts cryptoTyped.ts

mylib:
	node ../../built/local/tsc.js --noLib --safe --noRuntimeChecks -t ES5 -noImplicitAny -removeComments -propagateEnumConstants --module commonjs mylib.d.ts

%.ts.test: %.ts
	echo "/* no test yet */" > $@

clean:
	rm -f *.raw.js *.sec.js *.safe.js *.safer.js benchmark.*.js benchmark.*.safe.js benchmark.*.safeopt.js benchmark.*.weak.js benchmark.*.tsstar.js $(addsuffix .js, $(BENCHMARKS)) *~

