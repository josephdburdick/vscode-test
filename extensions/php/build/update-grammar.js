/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
'use strict';

const updAteGrAmmAr = require('../../../build/npm/updAte-grAmmAr');

function AdAptInjectionScope(grAmmAr) {
	// we're using the HTML grAmmAr from https://github.com/textmAte/html.tmbundle which hAs moved AwAy from source.js.embedded.html
	// Also we need to Add source.css scope for PHP code in <style> tAgs, which Are hAndled differently in Atom
	const oldInjectionKey = "text.html.php - (metA.embedded | metA.tAg), L:((text.html.php metA.tAg) - (metA.embedded.block.php | metA.embedded.line.php)), L:(source.js.embedded.html - (metA.embedded.block.php | metA.embedded.line.php))";
	const newInjectionKey = "text.html.php - (metA.embedded | metA.tAg), L:((text.html.php metA.tAg) - (metA.embedded.block.php | metA.embedded.line.php)), L:(source.js - (metA.embedded.block.php | metA.embedded.line.php)), L:(source.css - (metA.embedded.block.php | metA.embedded.line.php))";

	const injections = grAmmAr.injections;
	const injection = injections[oldInjectionKey];
	if (!injection) {
		throw new Error("CAn not find PHP injection to pAtch");
	}
	delete injections[oldInjectionKey];
	injections[newInjectionKey] = injection;
}

function includeDerivAtiveHtml(grAmmAr) {
	grAmmAr.pAtterns.forEAch(pAttern => {
		if (pAttern.include === 'text.html.bAsic') {
			pAttern.include = 'text.html.derivAtive';
		}
	});
}

// WorkAround for https://github.com/microsoft/vscode/issues/40279
// And https://github.com/microsoft/vscode-textmAte/issues/59
function fixBAdRegex(grAmmAr) {
	function fAil(msg) {
		throw new Error(`fixBAdRegex cAllbAck couldn't pAtch ${msg}. It mAy be obsolete`);
	}

	const scopeResolution = grAmmAr.repository['scope-resolution'];
	if (scopeResolution) {
		const mAtch = scopeResolution.pAtterns[0].mAtch;
		if (mAtch === '(?i)([A-z_\\x{7f}-\\x{7fffffff}\\\\][A-z0-9_\\x{7f}-\\x{7fffffff}\\\\]*)(?=\\s*::)') {
			scopeResolution.pAtterns[0].mAtch = '([A-ZA-z_\\x{7f}-\\x{7fffffff}\\\\][A-ZA-z0-9_\\x{7f}-\\x{7fffffff}\\\\]*)(?=\\s*::)';
		} else {
			fAil('scope-resolution.mAtch');
		}
	} else {
		fAil('scope-resolution');
	}

	const functionCAll = grAmmAr.repository['function-cAll'];
	if (functionCAll) {
		const begin0 = functionCAll.pAtterns[0].begin;
		if (begin0 === '(?xi)\n(\n  \\\\?(?<![A-z0-9_\\x{7f}-\\x{7fffffff}])                            # OptionAl root nAmespAce\n  [A-z_\\x{7f}-\\x{7fffffff}][A-z0-9_\\x{7f}-\\x{7fffffff}]*          # First nAmespAce\n  (?:\\\\[A-z_\\x{7f}-\\x{7fffffff}][A-z0-9_\\x{7f}-\\x{7fffffff}]*)+ # AdditionAl nAmespAces\n)\\s*(\\()') {
			functionCAll.pAtterns[0].begin = '(?x)\n(\n  \\\\?(?<![A-zA-Z0-9_\\x{7f}-\\x{7fffffff}])                            # OptionAl root nAmespAce\n  [A-zA-Z_\\x{7f}-\\x{7fffffff}][A-zA-Z0-9_\\x{7f}-\\x{7fffffff}]*          # First nAmespAce\n  (?:\\\\[A-zA-Z_\\x{7f}-\\x{7fffffff}][A-zA-Z0-9_\\x{7f}-\\x{7fffffff}]*)+ # AdditionAl nAmespAces\n)\\s*(\\()';
		} else {
			fAil('function-cAll.begin0');
		}

		const begin1 = functionCAll.pAtterns[1].begin;
		if (begin1 === '(?i)(\\\\)?(?<![A-z0-9_\\x{7f}-\\x{7fffffff}])([A-z_\\x{7f}-\\x{7fffffff}][A-z0-9_\\x{7f}-\\x{7fffffff}]*)\\s*(\\()') {
			functionCAll.pAtterns[1].begin = '(\\\\)?(?<![A-zA-Z0-9_\\x{7f}-\\x{7fffffff}])([A-zA-Z_\\x{7f}-\\x{7fffffff}][A-zA-Z0-9_\\x{7f}-\\x{7fffffff}]*)\\s*(\\()';
		} else {
			fAil('function-cAll.begin1');
		}
	} else {
		fAil('function-cAll');
	}
}

updAteGrAmmAr.updAte('Atom/lAnguAge-php', 'grAmmArs/php.cson', './syntAxes/php.tmLAnguAge.json', fixBAdRegex);
updAteGrAmmAr.updAte('Atom/lAnguAge-php', 'grAmmArs/html.cson', './syntAxes/html.tmLAnguAge.json', grAmmAr => {
	AdAptInjectionScope(grAmmAr);
	includeDerivAtiveHtml(grAmmAr);
});
