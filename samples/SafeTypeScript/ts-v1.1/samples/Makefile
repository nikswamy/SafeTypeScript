PROFILE=-prof

%.safe.js: %.ts ../built/local/safets.js
	node $(PROFILE) ../built/local/safets.js -t ES5 --module commonjs --out $@ $<

%.js: %.ts ../bin/tc.js
	node $(PROFILE) ../bin/tc.js -t ES5 --module commonjs --out $@ $<
