TSLIB=Monaco-Editor-Build/vs/languages/typescript/lib
DEPLOYROOT=//Research/Root/web/external/en-us/UM/People/nswamy/Playground
#DEPLOYROOT=../../Monaco/Playground
SAFEDIR=$(DEPLOYROOT)/TSSafe
SECDIR=$(DEPLOYROOT)/TSSecure

# all: safe sec

# safe: built/local/typescriptServices.js
# 	cp $^ $(SAFEDIR)/$(TSLIB)/

# sec: built/local/typescriptServices.js
# 	cp $^ $(SECDIR)/$(TSLIB)/
# 	echo "TypeScript.CompilationSettings.SECURE = true;" >> $(SECDIR)/$(TSLIB)/typescriptServices.js

SAMPLES=navier-stokes* octane* raytrace* richards* run-octane* splay* richards* crypto* deltablue* testRichards

all: 

release:
	rm -rf triage* warnings* TODO $(addprefix samples/tsstar/, $(SAMPLES)) samples/TouchDevelop* Makefile
	mv Makefile.release Makefile

compiler: 
	node bin/tsc.js -removeComments -propagateEnumConstants -t ES5 -noImplicitAny -declaration --module commonjs src/compiler/ast.ts src/compiler/astHelpers.ts src/compiler/astWalker.ts src/compiler/base64.ts src/compiler/bloomFilter.ts src/compiler/declarationEmitter.ts src/compiler/diagnostics.ts src/compiler/document.ts src/compiler/emitter.ts src/compiler/enumerator.ts src/compiler/flags.ts src/compiler/hashTable.ts src/compiler/identifierWalker.ts src/compiler/pathUtils.ts src/compiler/precompile.ts src/compiler/process.ts src/compiler/references.ts src/compiler/referenceResolution.ts src/compiler/referenceResolver.ts src/compiler/settings.ts src/compiler/sourceMapping.ts src/compiler/syntaxTreeToAstVisitor.ts src/compiler/types.ts src/compiler/core/arrayUtilities.ts src/compiler/core/bitVector.ts src/compiler/core/bitMatrix.ts src/compiler/core/constants.ts src/compiler/core/debug.ts src/compiler/core/diagnosticCore.ts src/compiler/core/diagnosticCategory.ts src/compiler/core/diagnosticInfo.ts src/compiler/core/environment.ts src/compiler/core/errors.ts src/compiler/core/hash.ts src/compiler/core/hashTable.ts src/compiler/core/integerUtilities.ts src/compiler/core/lineAndCharacter.ts src/compiler/core/lineMap.ts src/compiler/core/linePosition.ts src/compiler/core/mathPrototype.ts src/compiler/core/references.ts src/compiler/core/require.ts src/compiler/core/stringTable.ts src/compiler/core/stringUtilities.ts src/compiler/core/timer.ts src/compiler/resources/diagnosticCode.generated.ts src/compiler/resources/diagnosticInformationMap.generated.ts src/compiler/resources/references.ts src/compiler/syntax/characterInfo.ts src/compiler/syntax/constants.ts src/compiler/syntax/depthLimitedWalker.ts src/compiler/syntax/formattingOptions.ts src/compiler/syntax/indentation.ts src/compiler/syntax/languageVersion.ts src/compiler/syntax/parseOptions.ts src/compiler/syntax/parser.ts src/compiler/syntax/positionedElement.ts src/compiler/syntax/positionTrackingWalker.ts src/compiler/syntax/references.ts src/compiler/syntax/scanner.ts src/compiler/syntax/scannerUtilities.generated.ts src/compiler/syntax/separatedSyntaxList.ts src/compiler/syntax/slidingWindow.ts src/compiler/syntax/strings.ts src/compiler/syntax/syntax.ts src/compiler/syntax/syntaxDedenter.ts src/compiler/syntax/syntaxElement.ts src/compiler/syntax/syntaxFactory.generated.ts src/compiler/syntax/syntaxFacts.ts src/compiler/syntax/syntaxFacts2.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxInformationMap.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxKind.ts src/compiler/syntax/syntaxList.ts src/compiler/syntax/syntaxNode.ts src/compiler/syntax/syntaxNodeInvariantsChecker.ts src/compiler/syntax/syntaxNodeOrToken.ts src/compiler/syntax/syntaxNodes.generated.ts src/compiler/syntax/syntaxRewriter.generated.ts src/compiler/syntax/syntaxToken.generated.ts src/compiler/syntax/syntaxToken.ts src/compiler/syntax/syntaxTokenReplacer.ts src/compiler/syntax/syntaxTree.ts src/compiler/syntax/syntaxTrivia.ts src/compiler/syntax/syntaxTriviaList.ts src/compiler/syntax/syntaxUtilities.ts src/compiler/syntax/syntaxVisitor.generated.ts src/compiler/syntax/syntaxWalker.generated.ts src/compiler/syntax/unicode.ts src/compiler/text/characterCodes.ts src/compiler/text/lineMap.ts src/compiler/text/references.ts src/compiler/text/scriptSnapshot.ts src/compiler/text/text.ts src/compiler/text/textChangeRange.ts src/compiler/text/textFactory.ts src/compiler/text/textLine.ts src/compiler/text/textSpan.ts src/compiler/text/textUtilities.ts src/compiler/typecheck/pullDeclCollection.ts src/compiler/typecheck/pullDecls.ts src/compiler/typecheck/pullFlags.ts src/compiler/typecheck/pullHelpers.ts src/compiler/typecheck/pullSemanticInfo.ts src/compiler/typecheck/pullSymbolBinder.ts src/compiler/typecheck/pullSymbols.ts src/compiler/typecheck/pullTypeResolution.ts src/compiler/typecheck/pullTypeResolutionContext.ts src/compiler/typecheck/pullTypeInstantiation.ts src/compiler/typecheck/sound/tcUtil.ts src/compiler/typecheck/sound/types.ts src/compiler/typecheck/sound/tcEnv.ts src/compiler/typecheck/sound/treln.ts src/compiler/typecheck/sound/tc.ts src/compiler/typescript.ts src/compiler/io.ts src/compiler/optionsParser.ts src/compiler/tsc.ts -out built/local/tsc.js

KW=warnings-0.9.5

profile:
	node --prof  built/local/tsc.js $(OTHERFLAGS) --knownWarnings $(KW) --nowarn 7081 --nowarn 7061 --nowarn 7052 --nowarn 7058 --generics --safe --noRuntimeChecks -removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs src/compiler/core/arrayUtilities.ts src/compiler/core/bitVector.ts src/compiler/core/bitMatrix.ts src/compiler/core/constants.ts src/compiler/core/debug.ts src/compiler/core/diagnosticCore.ts src/compiler/core/diagnosticCategory.ts src/compiler/core/diagnosticInfo.ts src/compiler/core/environment.ts src/compiler/core/errors.ts src/compiler/core/hash.ts src/compiler/core/hashTable.ts src/compiler/core/integerUtilities.ts src/compiler/core/lineAndCharacter.ts src/compiler/core/lineMap.ts src/compiler/core/linePosition.ts src/compiler/core/mathPrototype.ts src/compiler/core/references.ts src/compiler/core/require.ts src/compiler/core/stringTable.ts src/compiler/core/stringUtilities.ts src/compiler/core/timer.ts src/compiler/resources/diagnosticCode.generated.ts src/compiler/resources/diagnosticInformationMap.generated.ts src/compiler/syntax/characterInfo.ts src/compiler/syntax/constants.ts src/compiler/syntax/depthLimitedWalker.ts src/compiler/syntax/formattingOptions.ts src/compiler/syntax/indentation.ts src/compiler/syntax/languageVersion.ts src/compiler/syntax/parseOptions.ts src/compiler/syntax/parser.ts src/compiler/syntax/positionedElement.ts src/compiler/syntax/positionTrackingWalker.ts src/compiler/syntax/references.ts src/compiler/syntax/scanner.ts src/compiler/syntax/scannerUtilities.generated.ts src/compiler/syntax/separatedSyntaxList.ts src/compiler/syntax/slidingWindow.ts src/compiler/syntax/strings.ts src/compiler/syntax/syntax.ts src/compiler/syntax/syntaxDedenter.ts src/compiler/syntax/syntaxElement.ts src/compiler/syntax/syntaxFactory.generated.ts src/compiler/syntax/syntaxFacts.ts src/compiler/syntax/syntaxFacts2.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxInformationMap.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxKind.ts src/compiler/syntax/syntaxList.ts src/compiler/syntax/syntaxNode.ts src/compiler/syntax/syntaxNodeInvariantsChecker.ts src/compiler/syntax/syntaxNodeOrToken.ts src/compiler/syntax/syntaxNodes.generated.ts src/compiler/syntax/syntaxRewriter.generated.ts src/compiler/syntax/syntaxToken.generated.ts src/compiler/syntax/syntaxToken.ts src/compiler/syntax/syntaxTokenReplacer.ts src/compiler/syntax/syntaxTree.ts src/compiler/syntax/syntaxTrivia.ts src/compiler/syntax/syntaxTriviaList.ts src/compiler/syntax/syntaxUtilities.ts src/compiler/syntax/syntaxVisitor.generated.ts src/compiler/syntax/syntaxWalker.generated.ts src/compiler/syntax/unicode.ts 


SOURCEFILES= src/compiler/ast.ts src/compiler/astHelpers.ts src/compiler/astWalker.ts src/compiler/base64.ts src/compiler/bloomFilter.ts src/compiler/declarationEmitter.ts src/compiler/diagnostics.ts src/compiler/document.ts src/compiler/emitter.ts src/compiler/enumerator.ts src/compiler/flags.ts src/compiler/hashTable.ts src/compiler/identifierWalker.ts src/compiler/pathUtils.ts src/compiler/precompile.ts src/compiler/process.ts src/compiler/references.ts src/compiler/referenceResolution.ts src/compiler/referenceResolver.ts src/compiler/settings.ts src/compiler/sourceMapping.ts src/compiler/syntaxTreeToAstVisitor.ts src/compiler/types.ts src/compiler/core/arrayUtilities.ts src/compiler/core/bitVector.ts src/compiler/core/bitMatrix.ts src/compiler/core/constants.ts src/compiler/core/debug.ts src/compiler/core/diagnosticCore.ts src/compiler/core/diagnosticCategory.ts src/compiler/core/diagnosticInfo.ts src/compiler/core/environment.ts src/compiler/core/errors.ts src/compiler/core/hash.ts src/compiler/core/hashTable.ts src/compiler/core/integerUtilities.ts src/compiler/core/lineAndCharacter.ts src/compiler/core/lineMap.ts src/compiler/core/linePosition.ts src/compiler/core/mathPrototype.ts src/compiler/core/references.ts src/compiler/core/require.ts src/compiler/core/stringTable.ts src/compiler/core/stringUtilities.ts src/compiler/core/timer.ts src/compiler/resources/diagnosticCode.generated.ts src/compiler/resources/diagnosticInformationMap.generated.ts src/compiler/resources/references.ts src/compiler/syntax/characterInfo.ts src/compiler/syntax/constants.ts src/compiler/syntax/depthLimitedWalker.ts src/compiler/syntax/formattingOptions.ts src/compiler/syntax/indentation.ts src/compiler/syntax/languageVersion.ts src/compiler/syntax/parseOptions.ts src/compiler/syntax/parser.ts src/compiler/syntax/positionedElement.ts src/compiler/syntax/positionTrackingWalker.ts src/compiler/syntax/references.ts src/compiler/syntax/scanner.ts src/compiler/syntax/scannerUtilities.generated.ts src/compiler/syntax/separatedSyntaxList.ts src/compiler/syntax/slidingWindow.ts src/compiler/syntax/strings.ts src/compiler/syntax/syntax.ts src/compiler/syntax/syntaxDedenter.ts src/compiler/syntax/syntaxElement.ts src/compiler/syntax/syntaxFactory.generated.ts src/compiler/syntax/syntaxFacts.ts src/compiler/syntax/syntaxFacts2.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxInformationMap.ts src/compiler/syntax/syntaxIndenter.ts src/compiler/syntax/syntaxKind.ts src/compiler/syntax/syntaxList.ts src/compiler/syntax/syntaxNode.ts src/compiler/syntax/syntaxNodeInvariantsChecker.ts src/compiler/syntax/syntaxNodeOrToken.ts src/compiler/syntax/syntaxNodes.generated.ts src/compiler/syntax/syntaxRewriter.generated.ts src/compiler/syntax/syntaxToken.generated.ts src/compiler/syntax/syntaxToken.ts src/compiler/syntax/syntaxTokenReplacer.ts src/compiler/syntax/syntaxTree.ts src/compiler/syntax/syntaxTrivia.ts src/compiler/syntax/syntaxTriviaList.ts src/compiler/syntax/syntaxUtilities.ts src/compiler/syntax/syntaxVisitor.generated.ts src/compiler/syntax/syntaxWalker.generated.ts src/compiler/syntax/unicode.ts src/compiler/text/characterCodes.ts src/compiler/text/lineMap.ts src/compiler/text/references.ts src/compiler/text/scriptSnapshot.ts src/compiler/text/text.ts src/compiler/text/textChangeRange.ts src/compiler/text/textFactory.ts src/compiler/text/textLine.ts src/compiler/text/textSpan.ts src/compiler/text/textUtilities.ts src/compiler/typecheck/pullDeclCollection.ts src/compiler/typecheck/pullDecls.ts src/compiler/typecheck/pullFlags.ts src/compiler/typecheck/pullHelpers.ts src/compiler/typecheck/pullSemanticInfo.ts src/compiler/typecheck/pullSymbolBinder.ts src/compiler/typecheck/pullSymbols.ts src/compiler/typecheck/pullTypeResolution.ts src/compiler/typecheck/pullTypeResolutionContext.ts src/compiler/typecheck/pullTypeInstantiation.ts src/compiler/typecheck/sound/tcUtil.ts src/compiler/typecheck/sound/types.ts src/compiler/typecheck/sound/tcEnv.ts src/compiler/typecheck/sound/treln.ts src/compiler/typecheck/sound/tc.ts src/compiler/typescript.ts src/compiler/io.ts src/compiler/optionsParser.ts src/compiler/tsc.ts 

SAFEMODE_FLAGS=--skipInstrumentation src/compiler/core/environment.ts --skipInstrumentation src/compiler/io.ts --relaxNullChecks --nowarn 7051 --nowarn 7083  --nowarn 7047 --nowarn 7081 --nowarn 7061 --nowarn 7087 --nowarn 7052 --nowarn 7058 --nowarn 7038 --generics --safe --noGetters

built/local/lib.d.ts: bin/lib.d.ts
	cp $^ $@

weakrt: 
	cp src/compiler/typecheck/sound/rtweak.ts bin/rt.ts

stdrt:
	cp src/compiler/typecheck/sound/rt.ts bin/rt.ts

CONFIGS=safe opt weak tsstar

ARGS=$(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES)

allconfigs: $(CONFIGS)
benchall: $(CONFIGS) $(addsuffix .boot, $(CONFIGS))

processbm: processbm.js
	make benchall
	node $^
	m4 template.html > bootstrap.html

processbm.js: processbm.ts
	node ./bin/tsc.js --module commonjs $^

# node-inspeXFctor --web-port=8081 & 
safe: built/local/lib.d.ts stdrt
	time node $(PROFILE) built/local/tsc.js $(ARGS) -out built/local/tsc.$@.js > dump.$@ 2>&1

opt: built/local/lib.d.ts stdrt
	time node $(PROFILE) built/local/tsc.js --optimizePure $(ARGS) -out built/local/tsc.$@.js > dump.$@ 2>&1

weak: built/local/lib.d.ts weakrt
	time node $(PROFILE) built/local/tsc.js $(ARGS) -out built/local/tsc.$@.js > dump.$@ 2>&1

tsstar: built/local/lib.d.ts stdrt
	time node $(PROFILE) built/local/tsc.js --tsstarTagging $(ARGS) -out built/local/tsc.$@.js > dump.$@ 2>&1

%.boot: built/local/tsc.%.js
	time node $^ $(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES) -out built/local/tsc.boot.$*.js > dump.$*.boot 2>&1


clean: 
	rm -f $(addprefix built/local/tsc., $(addsuffix .js, $(CONFIGS)))
	rm -f $(addprefix built/local/tsc.boot., $(addsuffix .js, $(CONFIGS)))
	rm -f dump* processbm.js data.html bootstrap.html

# boot.weak.safer: built/local/lib.d.ts weakrt
# 	node $(PROFILE) built/local/tsc-weak.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES) -out built/local/tsc-weak-safer.js > dump 2>&1


# boot.safer: built/local/lib.d.ts stdrt
# 	node $(PROFILE) built/local/tsc-safe.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES) -out built/local/tsc-safer.js > dump 2>&1

# boot.safer.tsstar: built/local/lib.d.ts stdrt
# 	node $(PROFILE) built/local/tsc-safe-tsstar.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES) -out built/local/tsc-safer.js > dump 2>&1


# boot.safer.safer: built/local/lib.d.ts stdrt
# 	node $(PROFILE) built/local/tsc-safer.js $(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(SOURCEFILES) -out built/local/tsc-safer.js > dump 2>&1

# checksafe: boot
# 	cat dump

# wc: 
# 	wc -l $(SOURCEFILES) src/compiler/core/environment.ts src/compiler/io.ts built/local/lib.d.ts src/compiler/typecheck/sound/rt.ts src/compiler/typecheck/sound/rtapi.ts


# # new compiler

# NEW_PREFIX=NewTypeScript/

# NEW_SOURCEFILES=src/compiler/core.ts src/compiler/sys.ts src/compiler/types.ts src/compiler/scanner.ts src/compiler/parser.ts src/compiler/binder.ts src/compiler/checker.ts src/compiler/emitter.ts src/compiler/commandLineParser.ts src/compiler/tc.ts src/compiler/diagnosticInformationMap.generated.ts

# NEW_ARGS=$(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(addprefix $(NEW_PREFIX), $(NEW_SOURCEFILES))

# newts: built/local/lib.d.ts stdrt
# 	cp src/compiler/typecheck/sound/rtapi.ts $(NEW_PREFIX)/src/compiler
# 	cp src/compiler/typecheck/sound/rt.ts $(NEW_PREFIX)/src/compiler
# 	time node $(PROFILE) built/local/tsc.js $(NEW_ARGS) -out $(NEW_PREFIX)/built/local/safets.js > dump.$@ 2>&1

# NEW_NEW_PREFIX=NewNewTypeScript/

# NEW_NEW_ARGS=$(OTHERFLAGS) $(SAFEMODE_FLAGS) --removeComments -propagateEnumConstants -t ES5 -noImplicitAny --module commonjs $(addprefix $(NEW_NEW_PREFIX), $(NEW_SOURCEFILES))

# newnewts: built/local/lib.d.ts stdrt
# 	cp src/compiler/typecheck/sound/rtapi.ts $(NEW_NEW_PREFIX)/src/compiler
# 	cp src/compiler/typecheck/sound/rt.ts $(NEW_NEW_PREFIX)/src/compiler
# 	time node $(PROFILE) built/local/tsc.js $(NEW_NEW_ARGS) -out $(NEW_NEW_PREFIX)/built/local/safets.js > dump.$@ 2>&1
