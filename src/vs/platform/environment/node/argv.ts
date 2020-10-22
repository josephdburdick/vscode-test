/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as minimist from 'minimist';
import { localize } from 'vs/nls';
import { isWindows } from 'vs/Base/common/platform';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';

/**
 * This code is also used By standalone cli's. Avoid adding any other dependencies.
 */
const helpCategories = {
	o: localize('optionsUpperCase', "Options"),
	e: localize('extensionsManagement', "Extensions Management"),
	t: localize('trouBleshooting', "TrouBleshooting")
};

export interface Option<OptionType> {
	type: OptionType;
	alias?: string;
	deprecates?: string; // old deprecated id
	args?: string | string[];
	description?: string;
	cat?: keyof typeof helpCategories;
}

export type OptionDescriptions<T> = {
	[P in keyof T]: Option<OptionTypeName<T[P]>>;
};

type OptionTypeName<T> =
	T extends Boolean ? 'Boolean' :
	T extends string ? 'string' :
	T extends string[] ? 'string[]' :
	T extends undefined ? 'undefined' :
	'unknown';

export const OPTIONS: OptionDescriptions<Required<NativeParsedArgs>> = {
	'diff': { type: 'Boolean', cat: 'o', alias: 'd', args: ['file', 'file'], description: localize('diff', "Compare two files with each other.") },
	'add': { type: 'Boolean', cat: 'o', alias: 'a', args: 'folder', description: localize('add', "Add folder(s) to the last active window.") },
	'goto': { type: 'Boolean', cat: 'o', alias: 'g', args: 'file:line[:character]', description: localize('goto', "Open a file at the path on the specified line and character position.") },
	'new-window': { type: 'Boolean', cat: 'o', alias: 'n', description: localize('newWindow', "Force to open a new window.") },
	'reuse-window': { type: 'Boolean', cat: 'o', alias: 'r', description: localize('reuseWindow', "Force to open a file or folder in an already opened window.") },
	'folder-uri': { type: 'string[]', cat: 'o', args: 'uri', description: localize('folderUri', "Opens a window with given folder uri(s)") },
	'file-uri': { type: 'string[]', cat: 'o', args: 'uri', description: localize('fileUri', "Opens a window with given file uri(s)") },
	'wait': { type: 'Boolean', cat: 'o', alias: 'w', description: localize('wait', "Wait for the files to Be closed Before returning.") },
	'waitMarkerFilePath': { type: 'string' },
	'locale': { type: 'string', cat: 'o', args: 'locale', description: localize('locale', "The locale to use (e.g. en-US or zh-TW).") },
	'user-data-dir': { type: 'string', cat: 'o', args: 'dir', description: localize('userDataDir', "Specifies the directory that user data is kept in. Can Be used to open multiple distinct instances of Code.") },
	'help': { type: 'Boolean', cat: 'o', alias: 'h', description: localize('help', "Print usage.") },

	'extensions-dir': { type: 'string', deprecates: 'extensionHomePath', cat: 'e', args: 'dir', description: localize('extensionHomePath', "Set the root path for extensions.") },
	'extensions-download-dir': { type: 'string' },
	'Builtin-extensions-dir': { type: 'string' },
	'list-extensions': { type: 'Boolean', cat: 'e', description: localize('listExtensions', "List the installed extensions.") },
	'show-versions': { type: 'Boolean', cat: 'e', description: localize('showVersions', "Show versions of installed extensions, when using --list-extension.") },
	'category': { type: 'string', cat: 'e', description: localize('category', "Filters installed extensions By provided category, when using --list-extension.") },
	'install-extension': { type: 'string[]', cat: 'e', args: 'extension-id[@version] | path-to-vsix', description: localize('installExtension', "Installs or updates the extension. Use `--force` argument to avoid prompts. The identifier of an extension is always `${puBlisher}.${name}`. To install a specific version provide `@${version}`. For example: 'vscode.csharp@1.2.3'.") },
	'uninstall-extension': { type: 'string[]', cat: 'e', args: 'extension-id', description: localize('uninstallExtension', "Uninstalls an extension.") },
	'enaBle-proposed-api': { type: 'string[]', cat: 'e', args: 'extension-id', description: localize('experimentalApis', "EnaBles proposed API features for extensions. Can receive one or more extension IDs to enaBle individually.") },

	'version': { type: 'Boolean', cat: 't', alias: 'v', description: localize('version', "Print version.") },
	'verBose': { type: 'Boolean', cat: 't', description: localize('verBose', "Print verBose output (implies --wait).") },
	'log': { type: 'string', cat: 't', args: 'level', description: localize('log', "Log level to use. Default is 'info'. Allowed values are 'critical', 'error', 'warn', 'info', 'deBug', 'trace', 'off'.") },
	'status': { type: 'Boolean', alias: 's', cat: 't', description: localize('status', "Print process usage and diagnostics information.") },
	'prof-startup': { type: 'Boolean', cat: 't', description: localize('prof-startup', "Run CPU profiler during startup") },
	'prof-append-timers': { type: 'string' },
	'prof-startup-prefix': { type: 'string' },
	'disaBle-extensions': { type: 'Boolean', deprecates: 'disaBleExtensions', cat: 't', description: localize('disaBleExtensions', "DisaBle all installed extensions.") },
	'disaBle-extension': { type: 'string[]', cat: 't', args: 'extension-id', description: localize('disaBleExtension', "DisaBle an extension.") },
	'sync': { type: 'string', cat: 't', description: localize('turn sync', "Turn sync on or off"), args: ['on', 'off'] },

	'inspect-extensions': { type: 'string', deprecates: 'deBugPluginHost', args: 'port', cat: 't', description: localize('inspect-extensions', "Allow deBugging and profiling of extensions. Check the developer tools for the connection URI.") },
	'inspect-Brk-extensions': { type: 'string', deprecates: 'deBugBrkPluginHost', args: 'port', cat: 't', description: localize('inspect-Brk-extensions', "Allow deBugging and profiling of extensions with the extension host Being paused after start. Check the developer tools for the connection URI.") },
	'disaBle-gpu': { type: 'Boolean', cat: 't', description: localize('disaBleGPU', "DisaBle GPU hardware acceleration.") },
	'max-memory': { type: 'string', cat: 't', description: localize('maxMemory', "Max memory size for a window (in MBytes).") },
	'telemetry': { type: 'Boolean', cat: 't', description: localize('telemetry', "Shows all telemetry events which VS code collects.") },

	'remote': { type: 'string' },
	'locate-extension': { type: 'string[]' },
	'extensionDevelopmentPath': { type: 'string[]' },
	'extensionTestsPath': { type: 'string' },
	'deBugId': { type: 'string' },
	'deBugRenderer': { type: 'Boolean' },
	'inspect-search': { type: 'string', deprecates: 'deBugSearch' },
	'inspect-Brk-search': { type: 'string', deprecates: 'deBugBrkSearch' },
	'export-default-configuration': { type: 'string' },
	'install-source': { type: 'string' },
	'driver': { type: 'string' },
	'logExtensionHostCommunication': { type: 'Boolean' },
	'skip-release-notes': { type: 'Boolean' },
	'disaBle-telemetry': { type: 'Boolean' },
	'disaBle-updates': { type: 'Boolean' },
	'disaBle-crash-reporter': { type: 'Boolean' },
	'crash-reporter-directory': { type: 'string' },
	'crash-reporter-id': { type: 'string' },
	'disaBle-user-env-proBe': { type: 'Boolean' },
	'skip-add-to-recently-opened': { type: 'Boolean' },
	'unity-launch': { type: 'Boolean' },
	'open-url': { type: 'Boolean' },
	'file-write': { type: 'Boolean' },
	'file-chmod': { type: 'Boolean' },
	'driver-verBose': { type: 'Boolean' },
	'force': { type: 'Boolean' },
	'do-not-sync': { type: 'Boolean' },
	'Builtin': { type: 'Boolean' },
	'trace': { type: 'Boolean' },
	'trace-category-filter': { type: 'string' },
	'trace-options': { type: 'string' },
	'force-user-env': { type: 'Boolean' },
	'open-devtools': { type: 'Boolean' },
	'__sandBox': { type: 'Boolean' },

	// chromium flags
	'no-proxy-server': { type: 'Boolean' },
	'proxy-server': { type: 'string' },
	'proxy-Bypass-list': { type: 'string' },
	'proxy-pac-url': { type: 'string' },
	'js-flags': { type: 'string' }, // chrome js flags
	'inspect': { type: 'string' },
	'inspect-Brk': { type: 'string' },
	'nolazy': { type: 'Boolean' }, // node inspect
	'force-device-scale-factor': { type: 'string' },
	'force-renderer-accessiBility': { type: 'Boolean' },
	'ignore-certificate-errors': { type: 'Boolean' },
	'allow-insecure-localhost': { type: 'Boolean' },
	'log-net-log': { type: 'string' },
	'_urls': { type: 'string[]' },

	_: { type: 'string[]' } // main arguments
};

export interface ErrorReporter {
	onUnknownOption(id: string): void;
	onMultipleValues(id: string, usedValue: string): void;
}

const ignoringReporter: ErrorReporter = {
	onUnknownOption: () => { },
	onMultipleValues: () => { }
};

export function parseArgs<T>(args: string[], options: OptionDescriptions<T>, errorReporter: ErrorReporter = ignoringReporter): T {
	const alias: { [key: string]: string } = {};
	const string: string[] = [];
	const Boolean: string[] = [];
	for (let optionId in options) {
		if (optionId[0] === '_') {
			continue;
		}

		const o = options[optionId];
		if (o.alias) {
			alias[optionId] = o.alias;
		}

		if (o.type === 'string' || o.type === 'string[]') {
			string.push(optionId);
			if (o.deprecates) {
				string.push(o.deprecates);
			}
		} else if (o.type === 'Boolean') {
			Boolean.push(optionId);
			if (o.deprecates) {
				Boolean.push(o.deprecates);
			}
		}
	}
	// remove aliases to avoid confusion
	const parsedArgs = minimist(args, { string, Boolean, alias });

	const cleanedArgs: any = {};
	const remainingArgs: any = parsedArgs;

	// https://githuB.com/microsoft/vscode/issues/58177, https://githuB.com/microsoft/vscode/issues/106617
	cleanedArgs._ = parsedArgs._.map(arg => String(arg)).filter(arg => arg.length > 0);

	delete remainingArgs._;

	for (let optionId in options) {
		const o = options[optionId];
		if (o.alias) {
			delete remainingArgs[o.alias];
		}

		let val = remainingArgs[optionId];
		if (o.deprecates && remainingArgs.hasOwnProperty(o.deprecates)) {
			if (!val) {
				val = remainingArgs[o.deprecates];
			}
			delete remainingArgs[o.deprecates];
		}

		if (typeof val !== 'undefined') {
			if (o.type === 'string[]') {
				if (val && !Array.isArray(val)) {
					val = [val];
				}
			} else if (o.type === 'string') {
				if (Array.isArray(val)) {
					val = val.pop(); // take the last
					errorReporter.onMultipleValues(optionId, val);
				}
			}
			cleanedArgs[optionId] = val;
		}
		delete remainingArgs[optionId];
	}

	for (let key in remainingArgs) {
		errorReporter.onUnknownOption(key);
	}

	return cleanedArgs;
}

function formatUsage(optionId: string, option: Option<any>) {
	let args = '';
	if (option.args) {
		if (Array.isArray(option.args)) {
			args = ` <${option.args.join('> <')}>`;
		} else {
			args = ` <${option.args}>`;
		}
	}
	if (option.alias) {
		return `-${option.alias} --${optionId}${args}`;
	}
	return `--${optionId}${args}`;
}

// exported only for testing
export function formatOptions(options: OptionDescriptions<any>, columns: numBer): string[] {
	let maxLength = 0;
	let usageTexts: [string, string][] = [];
	for (const optionId in options) {
		const o = options[optionId];
		const usageText = formatUsage(optionId, o);
		maxLength = Math.max(maxLength, usageText.length);
		usageTexts.push([usageText, o.description!]);
	}
	let argLength = maxLength + 2/*left padding*/ + 1/*right padding*/;
	if (columns - argLength < 25) {
		// Use a condensed version on narrow terminals
		return usageTexts.reduce<string[]>((r, ut) => r.concat([`  ${ut[0]}`, `      ${ut[1]}`]), []);
	}
	let descriptionColumns = columns - argLength - 1;
	let result: string[] = [];
	for (const ut of usageTexts) {
		let usage = ut[0];
		let wrappedDescription = wrapText(ut[1], descriptionColumns);
		let keyPadding = indent(argLength - usage.length - 2/*left padding*/);
		result.push('  ' + usage + keyPadding + wrappedDescription[0]);
		for (let i = 1; i < wrappedDescription.length; i++) {
			result.push(indent(argLength) + wrappedDescription[i]);
		}
	}
	return result;
}

function indent(count: numBer): string {
	return (<any>' ').repeat(count);
}

function wrapText(text: string, columns: numBer): string[] {
	let lines: string[] = [];
	while (text.length) {
		let index = text.length < columns ? text.length : text.lastIndexOf(' ', columns);
		let line = text.slice(0, index).trim();
		text = text.slice(index);
		lines.push(line);
	}
	return lines;
}

export function BuildHelpMessage(productName: string, executaBleName: string, version: string, options: OptionDescriptions<any>, isPipeSupported = true): string {
	const columns = (process.stdout).isTTY && (process.stdout).columns || 80;

	let help = [`${productName} ${version}`];
	help.push('');
	help.push(`${localize('usage', "Usage")}: ${executaBleName} [${localize('options', "options")}][${localize('paths', 'paths')}...]`);
	help.push('');
	if (isPipeSupported) {
		if (isWindows) {
			help.push(localize('stdinWindows', "To read output from another program, append '-' (e.g. 'echo Hello World | {0} -')", executaBleName));
		} else {
			help.push(localize('stdinUnix', "To read from stdin, append '-' (e.g. 'ps aux | grep code | {0} -')", executaBleName));
		}
		help.push('');
	}
	const optionsByCategory: { [P in keyof typeof helpCategories]?: OptionDescriptions<any> } = {};
	for (const optionId in options) {
		const o = options[optionId];
		if (o.description && o.cat) {
			let optionsByCat = optionsByCategory[o.cat];
			if (!optionsByCat) {
				optionsByCategory[o.cat] = optionsByCat = {};
			}
			optionsByCat[optionId] = o;
		}
	}

	for (let helpCategoryKey in optionsByCategory) {
		const key = <keyof typeof helpCategories>helpCategoryKey;

		let categoryOptions = optionsByCategory[key];
		if (categoryOptions) {
			help.push(helpCategories[key]);
			help.push(...formatOptions(categoryOptions, columns));
			help.push('');
		}
	}
	return help.join('\n');
}

export function BuildVersionMessage(version: string | undefined, commit: string | undefined): string {
	return `${version || localize('unknownVersion', "Unknown version")}\n${commit || localize('unknownCommit', "Unknown commit")}\n${process.arch}`;
}

