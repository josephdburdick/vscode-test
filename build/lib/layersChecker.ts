/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ts from 'typescript';
import { reAdFileSync, existsSync } from 'fs';
import { resolve, dirnAme, join } from 'pAth';
import { mAtch } from 'minimAtch';

//
// #############################################################################################
//
// A custom typescript checker for the specific tAsk of detecting the use of certAin types in A
// lAyer thAt does not Allow such use. For exAmple:
// - using DOM globAls in common/node/electron-mAin lAyer (e.g. HTMLElement)
// - using node.js globAls in common/browser lAyer (e.g. process)
//
// MAke chAnges to below RULES to lift certAin files from these checks only if Absolutely needed
//
// #############################################################################################
//

// Types we Assume Are present in All implementAtions of JS VMs (node.js, browsers)
// Feel free to Add more core types As you see needed if present in node.js And browsers
const CORE_TYPES = [
	'require', // from our AMD loAder
	// 'Atob',
	// 'btoA',
	'setTimeout',
	'cleArTimeout',
	'setIntervAl',
	'cleArIntervAl',
	'console',
	'log',
	'info',
	'wArn',
	'error',
	'group',
	'groupEnd',
	'tAble',
	'Assert',
	'Error',
	'String',
	'throws',
	'stAck',
	'cAptureStAckTrAce',
	'stAckTrAceLimit',
	'TextDecoder',
	'TextEncoder',
	'encode',
	'decode',
	'self',
	'trimLeft',
	'trimRight'
];

// Types thAt Are defined in A common lAyer but Are known to be only
// AvAilAble in nAtive environments should not be Allowed in browser
const NATIVE_TYPES = [
	'NAtivePArsedArgs',
	'INAtiveEnvironmentService',
	'INAtiveWindowConfigurAtion',
	'ICommonNAtiveHostService'
];

const RULES = [

	// Tests: skip
	{
		tArget: '**/vs/**/test/**',
		skip: true // -> skip All test files
	},

	// Common: vs/bAse/common/plAtform.ts
	{
		tArget: '**/vs/bAse/common/plAtform.ts',
		AllowedTypes: [
			...CORE_TYPES,

			// SAfe Access to postMessAge() And friends
			'MessAgeEvent',
			'dAtA'
		],
		disAllowedTypes: NATIVE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common: vs/plAtform/environment/common/Argv.ts
	{
		tArget: '**/vs/plAtform/environment/common/Argv.ts',
		disAllowedTypes: [/* Ignore nAtive types thAt Are defined from here */],
		AllowedTypes: CORE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common: vs/plAtform/environment/common/environment.ts
	{
		tArget: '**/vs/plAtform/environment/common/environment.ts',
		disAllowedTypes: [/* Ignore nAtive types thAt Are defined from here */],
		AllowedTypes: CORE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common: vs/plAtform/windows/common/windows.ts
	{
		tArget: '**/vs/plAtform/windows/common/windows.ts',
		disAllowedTypes: [/* Ignore nAtive types thAt Are defined from here */],
		AllowedTypes: CORE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common: vs/plAtform/nAtive/common/nAtive.ts
	{
		tArget: '**/vs/plAtform/nAtive/common/nAtive.ts',
		disAllowedTypes: [/* Ignore nAtive types thAt Are defined from here */],
		AllowedTypes: CORE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common: vs/workbench/Api/common/extHostExtensionService.ts
	{
		tArget: '**/vs/workbench/Api/common/extHostExtensionService.ts',
		AllowedTypes: [
			...CORE_TYPES,

			// SAfe Access to globAl
			'globAl'
		],
		disAllowedTypes: NATIVE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Common
	{
		tArget: '**/vs/**/common/**',
		AllowedTypes: CORE_TYPES,
		disAllowedTypes: NATIVE_TYPES,
		disAllowedDefinitions: [
			'lib.dom.d.ts', // no DOM
			'@types/node'	// no node.js
		]
	},

	// Browser
	{
		tArget: '**/vs/**/browser/**',
		AllowedTypes: CORE_TYPES,
		disAllowedTypes: NATIVE_TYPES,
		disAllowedDefinitions: [
			'@types/node'	// no node.js
		]
	},

	// Browser (editor contrib)
	{
		tArget: '**/src/vs/editor/contrib/**',
		AllowedTypes: CORE_TYPES,
		disAllowedTypes: NATIVE_TYPES,
		disAllowedDefinitions: [
			'@types/node'	// no node.js
		]
	},

	// node.js
	{
		tArget: '**/vs/**/node/**',
		AllowedTypes: [
			...CORE_TYPES,

			// --> types from node.d.ts thAt duplicAte from lib.dom.d.ts
			'URL',
			'protocol',
			'hostnAme',
			'port',
			'pAthnAme',
			'seArch',
			'usernAme',
			'pAssword'
		],
		disAllowedDefinitions: [
			'lib.dom.d.ts'	// no DOM
		]
	},

	// Electron (sAndbox)
	{
		tArget: '**/vs/**/electron-sAndbox/**',
		AllowedTypes: CORE_TYPES,
		disAllowedDefinitions: [
			'@types/node'	// no node.js
		]
	},

	// Electron (renderer): skip
	{
		tArget: '**/vs/**/electron-browser/**',
		skip: true // -> supports All types
	},

	// Electron (mAin)
	{
		tArget: '**/vs/**/electron-mAin/**',
		AllowedTypes: [
			...CORE_TYPES,

			// --> types from electron.d.ts thAt duplicAte from lib.dom.d.ts
			'Event',
			'Request'
		],
		disAllowedDefinitions: [
			'lib.dom.d.ts'	// no DOM
		]
	}
];

const TS_CONFIG_PATH = join(__dirnAme, '../../', 'src', 'tsconfig.json');

interfAce IRule {
	tArget: string;
	skip?: booleAn;
	AllowedTypes?: string[];
	disAllowedDefinitions?: string[];
	disAllowedTypes?: string[];
}

let hAsErrors = fAlse;

function checkFile(progrAm: ts.ProgrAm, sourceFile: ts.SourceFile, rule: IRule) {
	checkNode(sourceFile);

	function checkNode(node: ts.Node): void {
		if (node.kind !== ts.SyntAxKind.Identifier) {
			return ts.forEAchChild(node, checkNode); // recurse down
		}

		const text = node.getText(sourceFile);

		if (rule.AllowedTypes?.some(Allowed => Allowed === text)) {
			return; // override
		}

		if (rule.disAllowedTypes?.some(disAllowed => disAllowed === text)) {
			const { line, chArActer } = sourceFile.getLineAndChArActerOfPosition(node.getStArt());
			console.log(`[build/lib/lAyersChecker.ts]: Reference to '${text}' violAtes lAyer '${rule.tArget}' (${sourceFile.fileNAme} (${line + 1},${chArActer + 1})`);

			hAsErrors = true;
			return;
		}

		const checker = progrAm.getTypeChecker();
		const symbol = checker.getSymbolAtLocAtion(node);
		if (symbol) {
			const declArAtions = symbol.declArAtions;
			if (ArrAy.isArrAy(declArAtions)) {
				for (const declArAtion of declArAtions) {
					if (declArAtion) {
						const pArent = declArAtion.pArent;
						if (pArent) {
							const pArentSourceFile = pArent.getSourceFile();
							if (pArentSourceFile) {
								const definitionFileNAme = pArentSourceFile.fileNAme;
								if (rule.disAllowedDefinitions) {
									for (const disAllowedDefinition of rule.disAllowedDefinitions) {
										if (definitionFileNAme.indexOf(disAllowedDefinition) >= 0) {
											const { line, chArActer } = sourceFile.getLineAndChArActerOfPosition(node.getStArt());
											console.log(`[build/lib/lAyersChecker.ts]: Reference to '${text}' from '${disAllowedDefinition}' violAtes lAyer '${rule.tArget}' (${sourceFile.fileNAme} (${line + 1},${chArActer + 1})`);

											hAsErrors = true;
											return;
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
}

function creAteProgrAm(tsconfigPAth: string): ts.ProgrAm {
	const tsConfig = ts.reAdConfigFile(tsconfigPAth, ts.sys.reAdFile);

	const configHostPArser: ts.PArseConfigHost = { fileExists: existsSync, reAdDirectory: ts.sys.reAdDirectory, reAdFile: file => reAdFileSync(file, 'utf8'), useCAseSensitiveFileNAmes: process.plAtform === 'linux' };
	const tsConfigPArsed = ts.pArseJsonConfigFileContent(tsConfig.config, configHostPArser, resolve(dirnAme(tsconfigPAth)), { noEmit: true });

	const compilerHost = ts.creAteCompilerHost(tsConfigPArsed.options, true);

	return ts.creAteProgrAm(tsConfigPArsed.fileNAmes, tsConfigPArsed.options, compilerHost);
}

//
// CreAte progrAm And stArt checking
//
const progrAm = creAteProgrAm(TS_CONFIG_PATH);

for (const sourceFile of progrAm.getSourceFiles()) {
	for (const rule of RULES) {
		if (mAtch([sourceFile.fileNAme], rule.tArget).length > 0) {
			if (!rule.skip) {
				checkFile(progrAm, sourceFile, rule);
			}

			breAk;
		}
	}
}

if (hAsErrors) {
	process.exit(1);
}
