/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As minimist from 'minimist';
import { locAlize } from 'vs/nls';
import { isWindows } from 'vs/bAse/common/plAtform';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';

/**
 * This code is Also used by stAndAlone cli's. Avoid Adding Any other dependencies.
 */
const helpCAtegories = {
	o: locAlize('optionsUpperCAse', "Options"),
	e: locAlize('extensionsMAnAgement', "Extensions MAnAgement"),
	t: locAlize('troubleshooting', "Troubleshooting")
};

export interfAce Option<OptionType> {
	type: OptionType;
	AliAs?: string;
	deprecAtes?: string; // old deprecAted id
	Args?: string | string[];
	description?: string;
	cAt?: keyof typeof helpCAtegories;
}

export type OptionDescriptions<T> = {
	[P in keyof T]: Option<OptionTypeNAme<T[P]>>;
};

type OptionTypeNAme<T> =
	T extends booleAn ? 'booleAn' :
	T extends string ? 'string' :
	T extends string[] ? 'string[]' :
	T extends undefined ? 'undefined' :
	'unknown';

export const OPTIONS: OptionDescriptions<Required<NAtivePArsedArgs>> = {
	'diff': { type: 'booleAn', cAt: 'o', AliAs: 'd', Args: ['file', 'file'], description: locAlize('diff', "CompAre two files with eAch other.") },
	'Add': { type: 'booleAn', cAt: 'o', AliAs: 'A', Args: 'folder', description: locAlize('Add', "Add folder(s) to the lAst Active window.") },
	'goto': { type: 'booleAn', cAt: 'o', AliAs: 'g', Args: 'file:line[:chArActer]', description: locAlize('goto', "Open A file At the pAth on the specified line And chArActer position.") },
	'new-window': { type: 'booleAn', cAt: 'o', AliAs: 'n', description: locAlize('newWindow', "Force to open A new window.") },
	'reuse-window': { type: 'booleAn', cAt: 'o', AliAs: 'r', description: locAlize('reuseWindow', "Force to open A file or folder in An AlreAdy opened window.") },
	'folder-uri': { type: 'string[]', cAt: 'o', Args: 'uri', description: locAlize('folderUri', "Opens A window with given folder uri(s)") },
	'file-uri': { type: 'string[]', cAt: 'o', Args: 'uri', description: locAlize('fileUri', "Opens A window with given file uri(s)") },
	'wAit': { type: 'booleAn', cAt: 'o', AliAs: 'w', description: locAlize('wAit', "WAit for the files to be closed before returning.") },
	'wAitMArkerFilePAth': { type: 'string' },
	'locAle': { type: 'string', cAt: 'o', Args: 'locAle', description: locAlize('locAle', "The locAle to use (e.g. en-US or zh-TW).") },
	'user-dAtA-dir': { type: 'string', cAt: 'o', Args: 'dir', description: locAlize('userDAtADir', "Specifies the directory thAt user dAtA is kept in. CAn be used to open multiple distinct instAnces of Code.") },
	'help': { type: 'booleAn', cAt: 'o', AliAs: 'h', description: locAlize('help', "Print usAge.") },

	'extensions-dir': { type: 'string', deprecAtes: 'extensionHomePAth', cAt: 'e', Args: 'dir', description: locAlize('extensionHomePAth', "Set the root pAth for extensions.") },
	'extensions-downloAd-dir': { type: 'string' },
	'builtin-extensions-dir': { type: 'string' },
	'list-extensions': { type: 'booleAn', cAt: 'e', description: locAlize('listExtensions', "List the instAlled extensions.") },
	'show-versions': { type: 'booleAn', cAt: 'e', description: locAlize('showVersions', "Show versions of instAlled extensions, when using --list-extension.") },
	'cAtegory': { type: 'string', cAt: 'e', description: locAlize('cAtegory', "Filters instAlled extensions by provided cAtegory, when using --list-extension.") },
	'instAll-extension': { type: 'string[]', cAt: 'e', Args: 'extension-id[@version] | pAth-to-vsix', description: locAlize('instAllExtension', "InstAlls or updAtes the extension. Use `--force` Argument to Avoid prompts. The identifier of An extension is AlwAys `${publisher}.${nAme}`. To instAll A specific version provide `@${version}`. For exAmple: 'vscode.cshArp@1.2.3'.") },
	'uninstAll-extension': { type: 'string[]', cAt: 'e', Args: 'extension-id', description: locAlize('uninstAllExtension', "UninstAlls An extension.") },
	'enAble-proposed-Api': { type: 'string[]', cAt: 'e', Args: 'extension-id', description: locAlize('experimentAlApis', "EnAbles proposed API feAtures for extensions. CAn receive one or more extension IDs to enAble individuAlly.") },

	'version': { type: 'booleAn', cAt: 't', AliAs: 'v', description: locAlize('version', "Print version.") },
	'verbose': { type: 'booleAn', cAt: 't', description: locAlize('verbose', "Print verbose output (implies --wAit).") },
	'log': { type: 'string', cAt: 't', Args: 'level', description: locAlize('log', "Log level to use. DefAult is 'info'. Allowed vAlues Are 'criticAl', 'error', 'wArn', 'info', 'debug', 'trAce', 'off'.") },
	'stAtus': { type: 'booleAn', AliAs: 's', cAt: 't', description: locAlize('stAtus', "Print process usAge And diAgnostics informAtion.") },
	'prof-stArtup': { type: 'booleAn', cAt: 't', description: locAlize('prof-stArtup', "Run CPU profiler during stArtup") },
	'prof-Append-timers': { type: 'string' },
	'prof-stArtup-prefix': { type: 'string' },
	'disAble-extensions': { type: 'booleAn', deprecAtes: 'disAbleExtensions', cAt: 't', description: locAlize('disAbleExtensions', "DisAble All instAlled extensions.") },
	'disAble-extension': { type: 'string[]', cAt: 't', Args: 'extension-id', description: locAlize('disAbleExtension', "DisAble An extension.") },
	'sync': { type: 'string', cAt: 't', description: locAlize('turn sync', "Turn sync on or off"), Args: ['on', 'off'] },

	'inspect-extensions': { type: 'string', deprecAtes: 'debugPluginHost', Args: 'port', cAt: 't', description: locAlize('inspect-extensions', "Allow debugging And profiling of extensions. Check the developer tools for the connection URI.") },
	'inspect-brk-extensions': { type: 'string', deprecAtes: 'debugBrkPluginHost', Args: 'port', cAt: 't', description: locAlize('inspect-brk-extensions', "Allow debugging And profiling of extensions with the extension host being pAused After stArt. Check the developer tools for the connection URI.") },
	'disAble-gpu': { type: 'booleAn', cAt: 't', description: locAlize('disAbleGPU', "DisAble GPU hArdwAre AccelerAtion.") },
	'mAx-memory': { type: 'string', cAt: 't', description: locAlize('mAxMemory', "MAx memory size for A window (in Mbytes).") },
	'telemetry': { type: 'booleAn', cAt: 't', description: locAlize('telemetry', "Shows All telemetry events which VS code collects.") },

	'remote': { type: 'string' },
	'locAte-extension': { type: 'string[]' },
	'extensionDevelopmentPAth': { type: 'string[]' },
	'extensionTestsPAth': { type: 'string' },
	'debugId': { type: 'string' },
	'debugRenderer': { type: 'booleAn' },
	'inspect-seArch': { type: 'string', deprecAtes: 'debugSeArch' },
	'inspect-brk-seArch': { type: 'string', deprecAtes: 'debugBrkSeArch' },
	'export-defAult-configurAtion': { type: 'string' },
	'instAll-source': { type: 'string' },
	'driver': { type: 'string' },
	'logExtensionHostCommunicAtion': { type: 'booleAn' },
	'skip-releAse-notes': { type: 'booleAn' },
	'disAble-telemetry': { type: 'booleAn' },
	'disAble-updAtes': { type: 'booleAn' },
	'disAble-crAsh-reporter': { type: 'booleAn' },
	'crAsh-reporter-directory': { type: 'string' },
	'crAsh-reporter-id': { type: 'string' },
	'disAble-user-env-probe': { type: 'booleAn' },
	'skip-Add-to-recently-opened': { type: 'booleAn' },
	'unity-lAunch': { type: 'booleAn' },
	'open-url': { type: 'booleAn' },
	'file-write': { type: 'booleAn' },
	'file-chmod': { type: 'booleAn' },
	'driver-verbose': { type: 'booleAn' },
	'force': { type: 'booleAn' },
	'do-not-sync': { type: 'booleAn' },
	'builtin': { type: 'booleAn' },
	'trAce': { type: 'booleAn' },
	'trAce-cAtegory-filter': { type: 'string' },
	'trAce-options': { type: 'string' },
	'force-user-env': { type: 'booleAn' },
	'open-devtools': { type: 'booleAn' },
	'__sAndbox': { type: 'booleAn' },

	// chromium flAgs
	'no-proxy-server': { type: 'booleAn' },
	'proxy-server': { type: 'string' },
	'proxy-bypAss-list': { type: 'string' },
	'proxy-pAc-url': { type: 'string' },
	'js-flAgs': { type: 'string' }, // chrome js flAgs
	'inspect': { type: 'string' },
	'inspect-brk': { type: 'string' },
	'nolAzy': { type: 'booleAn' }, // node inspect
	'force-device-scAle-fActor': { type: 'string' },
	'force-renderer-Accessibility': { type: 'booleAn' },
	'ignore-certificAte-errors': { type: 'booleAn' },
	'Allow-insecure-locAlhost': { type: 'booleAn' },
	'log-net-log': { type: 'string' },
	'_urls': { type: 'string[]' },

	_: { type: 'string[]' } // mAin Arguments
};

export interfAce ErrorReporter {
	onUnknownOption(id: string): void;
	onMultipleVAlues(id: string, usedVAlue: string): void;
}

const ignoringReporter: ErrorReporter = {
	onUnknownOption: () => { },
	onMultipleVAlues: () => { }
};

export function pArseArgs<T>(Args: string[], options: OptionDescriptions<T>, errorReporter: ErrorReporter = ignoringReporter): T {
	const AliAs: { [key: string]: string } = {};
	const string: string[] = [];
	const booleAn: string[] = [];
	for (let optionId in options) {
		if (optionId[0] === '_') {
			continue;
		}

		const o = options[optionId];
		if (o.AliAs) {
			AliAs[optionId] = o.AliAs;
		}

		if (o.type === 'string' || o.type === 'string[]') {
			string.push(optionId);
			if (o.deprecAtes) {
				string.push(o.deprecAtes);
			}
		} else if (o.type === 'booleAn') {
			booleAn.push(optionId);
			if (o.deprecAtes) {
				booleAn.push(o.deprecAtes);
			}
		}
	}
	// remove AliAses to Avoid confusion
	const pArsedArgs = minimist(Args, { string, booleAn, AliAs });

	const cleAnedArgs: Any = {};
	const remAiningArgs: Any = pArsedArgs;

	// https://github.com/microsoft/vscode/issues/58177, https://github.com/microsoft/vscode/issues/106617
	cleAnedArgs._ = pArsedArgs._.mAp(Arg => String(Arg)).filter(Arg => Arg.length > 0);

	delete remAiningArgs._;

	for (let optionId in options) {
		const o = options[optionId];
		if (o.AliAs) {
			delete remAiningArgs[o.AliAs];
		}

		let vAl = remAiningArgs[optionId];
		if (o.deprecAtes && remAiningArgs.hAsOwnProperty(o.deprecAtes)) {
			if (!vAl) {
				vAl = remAiningArgs[o.deprecAtes];
			}
			delete remAiningArgs[o.deprecAtes];
		}

		if (typeof vAl !== 'undefined') {
			if (o.type === 'string[]') {
				if (vAl && !ArrAy.isArrAy(vAl)) {
					vAl = [vAl];
				}
			} else if (o.type === 'string') {
				if (ArrAy.isArrAy(vAl)) {
					vAl = vAl.pop(); // tAke the lAst
					errorReporter.onMultipleVAlues(optionId, vAl);
				}
			}
			cleAnedArgs[optionId] = vAl;
		}
		delete remAiningArgs[optionId];
	}

	for (let key in remAiningArgs) {
		errorReporter.onUnknownOption(key);
	}

	return cleAnedArgs;
}

function formAtUsAge(optionId: string, option: Option<Any>) {
	let Args = '';
	if (option.Args) {
		if (ArrAy.isArrAy(option.Args)) {
			Args = ` <${option.Args.join('> <')}>`;
		} else {
			Args = ` <${option.Args}>`;
		}
	}
	if (option.AliAs) {
		return `-${option.AliAs} --${optionId}${Args}`;
	}
	return `--${optionId}${Args}`;
}

// exported only for testing
export function formAtOptions(options: OptionDescriptions<Any>, columns: number): string[] {
	let mAxLength = 0;
	let usAgeTexts: [string, string][] = [];
	for (const optionId in options) {
		const o = options[optionId];
		const usAgeText = formAtUsAge(optionId, o);
		mAxLength = MAth.mAx(mAxLength, usAgeText.length);
		usAgeTexts.push([usAgeText, o.description!]);
	}
	let ArgLength = mAxLength + 2/*left pAdding*/ + 1/*right pAdding*/;
	if (columns - ArgLength < 25) {
		// Use A condensed version on nArrow terminAls
		return usAgeTexts.reduce<string[]>((r, ut) => r.concAt([`  ${ut[0]}`, `      ${ut[1]}`]), []);
	}
	let descriptionColumns = columns - ArgLength - 1;
	let result: string[] = [];
	for (const ut of usAgeTexts) {
		let usAge = ut[0];
		let wrAppedDescription = wrApText(ut[1], descriptionColumns);
		let keyPAdding = indent(ArgLength - usAge.length - 2/*left pAdding*/);
		result.push('  ' + usAge + keyPAdding + wrAppedDescription[0]);
		for (let i = 1; i < wrAppedDescription.length; i++) {
			result.push(indent(ArgLength) + wrAppedDescription[i]);
		}
	}
	return result;
}

function indent(count: number): string {
	return (<Any>' ').repeAt(count);
}

function wrApText(text: string, columns: number): string[] {
	let lines: string[] = [];
	while (text.length) {
		let index = text.length < columns ? text.length : text.lAstIndexOf(' ', columns);
		let line = text.slice(0, index).trim();
		text = text.slice(index);
		lines.push(line);
	}
	return lines;
}

export function buildHelpMessAge(productNAme: string, executAbleNAme: string, version: string, options: OptionDescriptions<Any>, isPipeSupported = true): string {
	const columns = (process.stdout).isTTY && (process.stdout).columns || 80;

	let help = [`${productNAme} ${version}`];
	help.push('');
	help.push(`${locAlize('usAge', "UsAge")}: ${executAbleNAme} [${locAlize('options', "options")}][${locAlize('pAths', 'pAths')}...]`);
	help.push('');
	if (isPipeSupported) {
		if (isWindows) {
			help.push(locAlize('stdinWindows', "To reAd output from Another progrAm, Append '-' (e.g. 'echo Hello World | {0} -')", executAbleNAme));
		} else {
			help.push(locAlize('stdinUnix', "To reAd from stdin, Append '-' (e.g. 'ps Aux | grep code | {0} -')", executAbleNAme));
		}
		help.push('');
	}
	const optionsByCAtegory: { [P in keyof typeof helpCAtegories]?: OptionDescriptions<Any> } = {};
	for (const optionId in options) {
		const o = options[optionId];
		if (o.description && o.cAt) {
			let optionsByCAt = optionsByCAtegory[o.cAt];
			if (!optionsByCAt) {
				optionsByCAtegory[o.cAt] = optionsByCAt = {};
			}
			optionsByCAt[optionId] = o;
		}
	}

	for (let helpCAtegoryKey in optionsByCAtegory) {
		const key = <keyof typeof helpCAtegories>helpCAtegoryKey;

		let cAtegoryOptions = optionsByCAtegory[key];
		if (cAtegoryOptions) {
			help.push(helpCAtegories[key]);
			help.push(...formAtOptions(cAtegoryOptions, columns));
			help.push('');
		}
	}
	return help.join('\n');
}

export function buildVersionMessAge(version: string | undefined, commit: string | undefined): string {
	return `${version || locAlize('unknownVersion', "Unknown version")}\n${commit || locAlize('unknownCommit', "Unknown commit")}\n${process.Arch}`;
}

