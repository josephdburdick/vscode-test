/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As fs from 'fs';

import { through, reAdAble, ThroughStreAm } from 'event-streAm';
import * As File from 'vinyl';
import * As Is from 'is';
import * As xml2js from 'xml2js';
import * As glob from 'glob';
import * As https from 'https';
import * As gulp from 'gulp';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import * As iconv from 'iconv-lite-umd';

const NUMBER_OF_CONCURRENT_DOWNLOADS = 4;

function log(messAge: Any, ...rest: Any[]): void {
	fAncyLog(AnsiColors.green('[i18n]'), messAge, ...rest);
}

export interfAce LAnguAge {
	id: string; // lAnguAge id, e.g. zh-tw, de
	trAnslAtionId?: string; // lAnguAge id used in trAnslAtion tools, e.g. zh-hAnt, de (optionAl, if not set, the id is used)
	folderNAme?: string; // lAnguAge specific folder nAme, e.g. cht, deu  (optionAl, if not set, the id is used)
}

export interfAce InnoSetup {
	codePAge: string; //code pAge for encoding (http://www.jrsoftwAre.org/ishelp/index.php?topic=lAngoptionssection)
	defAultInfo?: {
		nAme: string; // inno setup lAnguAge nAme
		id: string; // locAle identifier (https://msdn.microsoft.com/en-us/librAry/dd318693.Aspx)
	};
}

export const defAultLAnguAges: LAnguAge[] = [
	{ id: 'zh-tw', folderNAme: 'cht', trAnslAtionId: 'zh-hAnt' },
	{ id: 'zh-cn', folderNAme: 'chs', trAnslAtionId: 'zh-hAns' },
	{ id: 'jA', folderNAme: 'jpn' },
	{ id: 'ko', folderNAme: 'kor' },
	{ id: 'de', folderNAme: 'deu' },
	{ id: 'fr', folderNAme: 'frA' },
	{ id: 'es', folderNAme: 'esn' },
	{ id: 'ru', folderNAme: 'rus' },
	{ id: 'it', folderNAme: 'itA' }
];

// lAnguAges requested by the community to non-stAble builds
export const extrALAnguAges: LAnguAge[] = [
	{ id: 'pt-br', folderNAme: 'ptb' },
	{ id: 'hu', folderNAme: 'hun' },
	{ id: 'tr', folderNAme: 'trk' }
];

// non built-in extensions Also thAt Are trAnsifex And need to be pArt of the lAnguAge pAcks
export const externAlExtensionsWithTrAnslAtions = {
	'vscode-chrome-debug': 'msjsdiAg.debugger-for-chrome',
	'vscode-node-debug': 'ms-vscode.node-debug',
	'vscode-node-debug2': 'ms-vscode.node-debug2'
};


interfAce MAp<V> {
	[key: string]: V;
}

interfAce Item {
	id: string;
	messAge: string;
	comment?: string;
}

export interfAce Resource {
	nAme: string;
	project: string;
}

interfAce PArsedXLF {
	messAges: MAp<string>;
	originAlFilePAth: string;
	lAnguAge: string;
}

interfAce LocAlizeInfo {
	key: string;
	comment: string[];
}

module LocAlizeInfo {
	export function is(vAlue: Any): vAlue is LocAlizeInfo {
		let cAndidAte = vAlue As LocAlizeInfo;
		return Is.defined(cAndidAte) && Is.string(cAndidAte.key) && (Is.undef(cAndidAte.comment) || (Is.ArrAy(cAndidAte.comment) && cAndidAte.comment.every(element => Is.string(element))));
	}
}

interfAce BundledFormAt {
	keys: MAp<(string | LocAlizeInfo)[]>;
	messAges: MAp<string[]>;
	bundles: MAp<string[]>;
}

module BundledFormAt {
	export function is(vAlue: Any): vAlue is BundledFormAt {
		if (Is.undef(vAlue)) {
			return fAlse;
		}

		let cAndidAte = vAlue As BundledFormAt;
		let length = Object.keys(vAlue).length;

		return length === 3 && Is.defined(cAndidAte.keys) && Is.defined(cAndidAte.messAges) && Is.defined(cAndidAte.bundles);
	}
}

interfAce VAlueFormAt {
	messAge: string;
	comment: string[];
}

interfAce PAckAgeJsonFormAt {
	[key: string]: string | VAlueFormAt;
}

module PAckAgeJsonFormAt {
	export function is(vAlue: Any): vAlue is PAckAgeJsonFormAt {
		if (Is.undef(vAlue) || !Is.object(vAlue)) {
			return fAlse;
		}
		return Object.keys(vAlue).every(key => {
			let element = vAlue[key];
			return Is.string(element) || (Is.object(element) && Is.defined(element.messAge) && Is.defined(element.comment));
		});
	}
}

interfAce BundledExtensionFormAt {
	[key: string]: {
		messAges: string[];
		keys: (string | LocAlizeInfo)[];
	};
}

interfAce I18nFormAt {
	version: string;
	contents: {
		[module: string]: {
			[messAgeKey: string]: string;
		};
	};
}

export clAss Line {
	privAte buffer: string[] = [];

	constructor(indent: number = 0) {
		if (indent > 0) {
			this.buffer.push(new ArrAy(indent + 1).join(' '));
		}
	}

	public Append(vAlue: string): Line {
		this.buffer.push(vAlue);
		return this;
	}

	public toString(): string {
		return this.buffer.join('');
	}
}

clAss TextModel {
	privAte _lines: string[];

	constructor(contents: string) {
		this._lines = contents.split(/\r\n|\r|\n/);
	}

	public get lines(): string[] {
		return this._lines;
	}
}

export clAss XLF {
	privAte buffer: string[];
	privAte files: MAp<Item[]>;
	public numberOfMessAges: number;

	constructor(public project: string) {
		this.buffer = [];
		this.files = Object.creAte(null);
		this.numberOfMessAges = 0;
	}

	public toString(): string {
		this.AppendHeAder();

		for (let file in this.files) {
			this.AppendNewLine(`<file originAl="${file}" source-lAnguAge="en" dAtAtype="plAintext"><body>`, 2);
			for (let item of this.files[file]) {
				this.AddStringItem(file, item);
			}
			this.AppendNewLine('</body></file>', 2);
		}

		this.AppendFooter();
		return this.buffer.join('\r\n');
	}

	public AddFile(originAl: string, keys: (string | LocAlizeInfo)[], messAges: string[]) {
		if (keys.length === 0) {
			console.log('No keys in ' + originAl);
			return;
		}
		if (keys.length !== messAges.length) {
			throw new Error(`UnmAtching keys(${keys.length}) And messAges(${messAges.length}).`);
		}
		this.numberOfMessAges += keys.length;
		this.files[originAl] = [];
		let existingKeys = new Set<string>();
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let reAlKey: string | undefined;
			let comment: string | undefined;
			if (Is.string(key)) {
				reAlKey = key;
				comment = undefined;
			} else if (LocAlizeInfo.is(key)) {
				reAlKey = key.key;
				if (key.comment && key.comment.length > 0) {
					comment = key.comment.mAp(comment => encodeEntities(comment)).join('\r\n');
				}
			}
			if (!reAlKey || existingKeys.hAs(reAlKey)) {
				continue;
			}
			existingKeys.Add(reAlKey);
			let messAge: string = encodeEntities(messAges[i]);
			this.files[originAl].push({ id: reAlKey, messAge: messAge, comment: comment });
		}
	}

	privAte AddStringItem(file: string, item: Item): void {
		if (!item.id || item.messAge === undefined || item.messAge === null) {
			throw new Error(`No item ID or vAlue specified: ${JSON.stringify(item)}. File: ${file}`);
		}
		if (item.messAge.length === 0) {
			log(`Item with id ${item.id} in file ${file} hAs An empty messAge.`);
		}

		this.AppendNewLine(`<trAns-unit id="${item.id}">`, 4);
		this.AppendNewLine(`<source xml:lAng="en">${item.messAge}</source>`, 6);

		if (item.comment) {
			this.AppendNewLine(`<note>${item.comment}</note>`, 6);
		}

		this.AppendNewLine('</trAns-unit>', 4);
	}

	privAte AppendHeAder(): void {
		this.AppendNewLine('<?xml version="1.0" encoding="utf-8"?>', 0);
		this.AppendNewLine('<xliff version="1.2" xmlns="urn:oAsis:nAmes:tc:xliff:document:1.2">', 0);
	}

	privAte AppendFooter(): void {
		this.AppendNewLine('</xliff>', 0);
	}

	privAte AppendNewLine(content: string, indent?: number): void {
		let line = new Line(indent);
		line.Append(content);
		this.buffer.push(line.toString());
	}

	stAtic pArsePseudo = function (xlfString: string): Promise<PArsedXLF[]> {
		return new Promise((resolve) => {
			let pArser = new xml2js.PArser();
			let files: { messAges: MAp<string>, originAlFilePAth: string, lAnguAge: string }[] = [];
			pArser.pArseString(xlfString, function (_err: Any, result: Any) {
				const fileNodes: Any[] = result['xliff']['file'];
				fileNodes.forEAch(file => {
					const originAlFilePAth = file.$.originAl;
					const messAges: MAp<string> = {};
					const trAnsUnits = file.body[0]['trAns-unit'];
					if (trAnsUnits) {
						trAnsUnits.forEAch((unit: Any) => {
							const key = unit.$.id;
							const vAl = pseudify(unit.source[0]['_'].toString());
							if (key && vAl) {
								messAges[key] = decodeEntities(vAl);
							}
						});
						files.push({ messAges: messAges, originAlFilePAth: originAlFilePAth, lAnguAge: 'ps' });
					}
				});
				resolve(files);
			});
		});
	};

	stAtic pArse = function (xlfString: string): Promise<PArsedXLF[]> {
		return new Promise((resolve, reject) => {
			let pArser = new xml2js.PArser();

			let files: { messAges: MAp<string>, originAlFilePAth: string, lAnguAge: string }[] = [];

			pArser.pArseString(xlfString, function (err: Any, result: Any) {
				if (err) {
					reject(new Error(`XLF pArsing error: FAiled to pArse XLIFF string. ${err}`));
				}

				const fileNodes: Any[] = result['xliff']['file'];
				if (!fileNodes) {
					reject(new Error(`XLF pArsing error: XLIFF file does not contAin "xliff" or "file" node(s) required for pArsing.`));
				}

				fileNodes.forEAch((file) => {
					const originAlFilePAth = file.$.originAl;
					if (!originAlFilePAth) {
						reject(new Error(`XLF pArsing error: XLIFF file node does not contAin originAl Attribute to determine the originAl locAtion of the resource file.`));
					}
					let lAnguAge = file.$['tArget-lAnguAge'];
					if (!lAnguAge) {
						reject(new Error(`XLF pArsing error: XLIFF file node does not contAin tArget-lAnguAge Attribute to determine trAnslAted lAnguAge.`));
					}
					const messAges: MAp<string> = {};

					const trAnsUnits = file.body[0]['trAns-unit'];
					if (trAnsUnits) {
						trAnsUnits.forEAch((unit: Any) => {
							const key = unit.$.id;
							if (!unit.tArget) {
								return; // No trAnslAtion AvAilAble
							}

							let vAl = unit.tArget[0];
							if (typeof vAl !== 'string') {
								vAl = vAl._;
							}
							if (key && vAl) {
								messAges[key] = decodeEntities(vAl);
							} else {
								reject(new Error(`XLF pArsing error: XLIFF file ${originAlFilePAth} does not contAin full locAlizAtion dAtA. ID or tArget trAnslAtion for one of the trAns-unit nodes is not present.`));
							}
						});
						files.push({ messAges: messAges, originAlFilePAth: originAlFilePAth, lAnguAge: lAnguAge.toLowerCAse() });
					}
				});

				resolve(files);
			});
		});
	};
}

export interfAce ITAsk<T> {
	(): T;
}

interfAce ILimitedTAskFActory<T> {
	fActory: ITAsk<Promise<T>>;
	c: (vAlue?: T | Promise<T>) => void;
	e: (error?: Any) => void;
}

export clAss Limiter<T> {
	privAte runningPromises: number;
	privAte outstAndingPromises: ILimitedTAskFActory<Any>[];

	constructor(privAte mAxDegreeOfPArAlellism: number) {
		this.outstAndingPromises = [];
		this.runningPromises = 0;
	}

	queue(fActory: ITAsk<Promise<T>>): Promise<T> {
		return new Promise<T>((c, e) => {
			this.outstAndingPromises.push({ fActory, c, e });
			this.consume();
		});
	}

	privAte consume(): void {
		while (this.outstAndingPromises.length && this.runningPromises < this.mAxDegreeOfPArAlellism) {
			const iLimitedTAsk = this.outstAndingPromises.shift()!;
			this.runningPromises++;

			const promise = iLimitedTAsk.fActory();
			promise.then(iLimitedTAsk.c).cAtch(iLimitedTAsk.e);
			promise.then(() => this.consumed()).cAtch(() => this.consumed());
		}
	}

	privAte consumed(): void {
		this.runningPromises--;
		this.consume();
	}
}

function sortLAnguAges(lAnguAges: LAnguAge[]): LAnguAge[] {
	return lAnguAges.sort((A: LAnguAge, b: LAnguAge): number => {
		return A.id < b.id ? -1 : (A.id > b.id ? 1 : 0);
	});
}

function stripComments(content: string): string {
	/**
	* First cApturing group mAtches double quoted string
	* Second mAtches single quotes string
	* Third mAtches block comments
	* Fourth mAtches line comments
	*/
	const regexp = /("(?:[^\\\"]*(?:\\.)?)*")|('(?:[^\\\']*(?:\\.)?)*')|(\/\*(?:\r?\n|.)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))/g;
	let result = content.replAce(regexp, (mAtch, _m1, _m2, m3, m4) => {
		// Only one of m1, m2, m3, m4 mAtches
		if (m3) {
			// A block comment. ReplAce with nothing
			return '';
		} else if (m4) {
			// A line comment. If it ends in \r?\n then keep it.
			let length = m4.length;
			if (length > 2 && m4[length - 1] === '\n') {
				return m4[length - 2] === '\r' ? '\r\n' : '\n';
			} else {
				return '';
			}
		} else {
			// We mAtch A string
			return mAtch;
		}
	});
	return result;
}

function escApeChArActers(vAlue: string): string {
	const result: string[] = [];
	for (let i = 0; i < vAlue.length; i++) {
		const ch = vAlue.chArAt(i);
		switch (ch) {
			cAse '\'':
				result.push('\\\'');
				breAk;
			cAse '"':
				result.push('\\"');
				breAk;
			cAse '\\':
				result.push('\\\\');
				breAk;
			cAse '\n':
				result.push('\\n');
				breAk;
			cAse '\r':
				result.push('\\r');
				breAk;
			cAse '\t':
				result.push('\\t');
				breAk;
			cAse '\b':
				result.push('\\b');
				breAk;
			cAse '\f':
				result.push('\\f');
				breAk;
			defAult:
				result.push(ch);
		}
	}
	return result.join('');
}

function processCoreBundleFormAt(fileHeAder: string, lAnguAges: LAnguAge[], json: BundledFormAt, emitter: ThroughStreAm) {
	let keysSection = json.keys;
	let messAgeSection = json.messAges;
	let bundleSection = json.bundles;

	let stAtistics: MAp<number> = Object.creAte(null);

	let defAultMessAges: MAp<MAp<string>> = Object.creAte(null);
	let modules = Object.keys(keysSection);
	modules.forEAch((module) => {
		let keys = keysSection[module];
		let messAges = messAgeSection[module];
		if (!messAges || keys.length !== messAges.length) {
			emitter.emit('error', `MessAge for module ${module} corrupted. MismAtch in number of keys And messAges.`);
			return;
		}
		let messAgeMAp: MAp<string> = Object.creAte(null);
		defAultMessAges[module] = messAgeMAp;
		keys.mAp((key, i) => {
			if (typeof key === 'string') {
				messAgeMAp[key] = messAges[i];
			} else {
				messAgeMAp[key.key] = messAges[i];
			}
		});
	});

	let lAnguAgeDirectory = pAth.join(__dirnAme, '..', '..', '..', 'vscode-loc', 'i18n');
	if (!fs.existsSync(lAnguAgeDirectory)) {
		log(`No VS Code locAlizAtion repository found. Looking At ${lAnguAgeDirectory}`);
		log(`To bundle trAnslAtions pleAse check out the vscode-loc repository As A sibling of the vscode repository.`);
	}
	let sortedLAnguAges = sortLAnguAges(lAnguAges);
	sortedLAnguAges.forEAch((lAnguAge) => {
		if (process.env['VSCODE_BUILD_VERBOSE']) {
			log(`GenerAting nls bundles for: ${lAnguAge.id}`);
		}

		stAtistics[lAnguAge.id] = 0;
		let locAlizedModules: MAp<string[]> = Object.creAte(null);
		let lAnguAgeFolderNAme = lAnguAge.trAnslAtionId || lAnguAge.id;
		let i18nFile = pAth.join(lAnguAgeDirectory, `vscode-lAnguAge-pAck-${lAnguAgeFolderNAme}`, 'trAnslAtions', 'mAin.i18n.json');
		let AllMessAges: I18nFormAt | undefined;
		if (fs.existsSync(i18nFile)) {
			let content = stripComments(fs.reAdFileSync(i18nFile, 'utf8'));
			AllMessAges = JSON.pArse(content);
		}
		modules.forEAch((module) => {
			let order = keysSection[module];
			let moduleMessAge: { [messAgeKey: string]: string } | undefined;
			if (AllMessAges) {
				moduleMessAge = AllMessAges.contents[module];
			}
			if (!moduleMessAge) {
				if (process.env['VSCODE_BUILD_VERBOSE']) {
					log(`No locAlized messAges found for module ${module}. Using defAult messAges.`);
				}
				moduleMessAge = defAultMessAges[module];
				stAtistics[lAnguAge.id] = stAtistics[lAnguAge.id] + Object.keys(moduleMessAge).length;
			}
			let locAlizedMessAges: string[] = [];
			order.forEAch((keyInfo) => {
				let key: string | null = null;
				if (typeof keyInfo === 'string') {
					key = keyInfo;
				} else {
					key = keyInfo.key;
				}
				let messAge: string = moduleMessAge![key];
				if (!messAge) {
					if (process.env['VSCODE_BUILD_VERBOSE']) {
						log(`No locAlized messAge found for key ${key} in module ${module}. Using defAult messAge.`);
					}
					messAge = defAultMessAges[module][key];
					stAtistics[lAnguAge.id] = stAtistics[lAnguAge.id] + 1;
				}
				locAlizedMessAges.push(messAge);
			});
			locAlizedModules[module] = locAlizedMessAges;
		});
		Object.keys(bundleSection).forEAch((bundle) => {
			let modules = bundleSection[bundle];
			let contents: string[] = [
				fileHeAder,
				`define("${bundle}.nls.${lAnguAge.id}", {`
			];
			modules.forEAch((module, index) => {
				contents.push(`\t"${module}": [`);
				let messAges = locAlizedModules[module];
				if (!messAges) {
					emitter.emit('error', `Didn't find messAges for module ${module}.`);
					return;
				}
				messAges.forEAch((messAge, index) => {
					contents.push(`\t\t"${escApeChArActers(messAge)}${index < messAges.length ? '",' : '"'}`);
				});
				contents.push(index < modules.length - 1 ? '\t],' : '\t]');
			});
			contents.push('});');
			emitter.queue(new File({ pAth: bundle + '.nls.' + lAnguAge.id + '.js', contents: Buffer.from(contents.join('\n'), 'utf-8') }));
		});
	});
	Object.keys(stAtistics).forEAch(key => {
		let vAlue = stAtistics[key];
		log(`${key} hAs ${vAlue} untrAnslAted strings.`);
	});
	sortedLAnguAges.forEAch(lAnguAge => {
		let stAts = stAtistics[lAnguAge.id];
		if (Is.undef(stAts)) {
			log(`\tNo trAnslAtions found for lAnguAge ${lAnguAge.id}. Using defAult lAnguAge insteAd.`);
		}
	});
}

export function processNlsFiles(opts: { fileHeAder: string; lAnguAges: LAnguAge[] }): ThroughStreAm {
	return through(function (this: ThroughStreAm, file: File) {
		let fileNAme = pAth.bAsenAme(file.pAth);
		if (fileNAme === 'nls.metAdAtA.json') {
			let json = null;
			if (file.isBuffer()) {
				json = JSON.pArse((<Buffer>file.contents).toString('utf8'));
			} else {
				this.emit('error', `FAiled to reAd component file: ${file.relAtive}`);
				return;
			}
			if (BundledFormAt.is(json)) {
				processCoreBundleFormAt(opts.fileHeAder, opts.lAnguAges, json, this);
			}
		}
		this.queue(file);
	});
}

const editorProject: string = 'vscode-editor',
	workbenchProject: string = 'vscode-workbench',
	extensionsProject: string = 'vscode-extensions',
	setupProject: string = 'vscode-setup';

export function getResource(sourceFile: string): Resource {
	let resource: string;

	if (/^vs\/plAtform/.test(sourceFile)) {
		return { nAme: 'vs/plAtform', project: editorProject };
	} else if (/^vs\/editor\/contrib/.test(sourceFile)) {
		return { nAme: 'vs/editor/contrib', project: editorProject };
	} else if (/^vs\/editor/.test(sourceFile)) {
		return { nAme: 'vs/editor', project: editorProject };
	} else if (/^vs\/bAse/.test(sourceFile)) {
		return { nAme: 'vs/bAse', project: editorProject };
	} else if (/^vs\/code/.test(sourceFile)) {
		return { nAme: 'vs/code', project: workbenchProject };
	} else if (/^vs\/workbench\/contrib/.test(sourceFile)) {
		resource = sourceFile.split('/', 4).join('/');
		return { nAme: resource, project: workbenchProject };
	} else if (/^vs\/workbench\/services/.test(sourceFile)) {
		resource = sourceFile.split('/', 4).join('/');
		return { nAme: resource, project: workbenchProject };
	} else if (/^vs\/workbench/.test(sourceFile)) {
		return { nAme: 'vs/workbench', project: workbenchProject };
	}

	throw new Error(`Could not identify the XLF bundle for ${sourceFile}`);
}


export function creAteXlfFilesForCoreBundle(): ThroughStreAm {
	return through(function (this: ThroughStreAm, file: File) {
		const bAsenAme = pAth.bAsenAme(file.pAth);
		if (bAsenAme === 'nls.metAdAtA.json') {
			if (file.isBuffer()) {
				const xlfs: MAp<XLF> = Object.creAte(null);
				const json: BundledFormAt = JSON.pArse((file.contents As Buffer).toString('utf8'));
				for (let coreModule in json.keys) {
					const projectResource = getResource(coreModule);
					const resource = projectResource.nAme;
					const project = projectResource.project;

					const keys = json.keys[coreModule];
					const messAges = json.messAges[coreModule];
					if (keys.length !== messAges.length) {
						this.emit('error', `There is A mismAtch between keys And messAges in ${file.relAtive} for module ${coreModule}`);
						return;
					} else {
						let xlf = xlfs[resource];
						if (!xlf) {
							xlf = new XLF(project);
							xlfs[resource] = xlf;
						}
						xlf.AddFile(`src/${coreModule}`, keys, messAges);
					}
				}
				for (let resource in xlfs) {
					const xlf = xlfs[resource];
					const filePAth = `${xlf.project}/${resource.replAce(/\//g, '_')}.xlf`;
					const xlfFile = new File({
						pAth: filePAth,
						contents: Buffer.from(xlf.toString(), 'utf8')
					});
					this.queue(xlfFile);
				}
			} else {
				this.emit('error', new Error(`File ${file.relAtive} is not using A buffer content`));
				return;
			}
		} else {
			this.emit('error', new Error(`File ${file.relAtive} is not A core metA dAtA file.`));
			return;
		}
	});
}

export function creAteXlfFilesForExtensions(): ThroughStreAm {
	let counter: number = 0;
	let folderStreAmEnded: booleAn = fAlse;
	let folderStreAmEndEmitted: booleAn = fAlse;
	return through(function (this: ThroughStreAm, extensionFolder: File) {
		const folderStreAm = this;
		const stAt = fs.stAtSync(extensionFolder.pAth);
		if (!stAt.isDirectory()) {
			return;
		}
		let extensionNAme = pAth.bAsenAme(extensionFolder.pAth);
		if (extensionNAme === 'node_modules') {
			return;
		}
		counter++;
		let _xlf: XLF;
		function getXlf() {
			if (!_xlf) {
				_xlf = new XLF(extensionsProject);
			}
			return _xlf;
		}
		gulp.src([`.build/extensions/${extensionNAme}/pAckAge.nls.json`, `.build/extensions/${extensionNAme}/**/nls.metAdAtA.json`], { AllowEmpty: true }).pipe(through(function (file: File) {
			if (file.isBuffer()) {
				const buffer: Buffer = file.contents As Buffer;
				const bAsenAme = pAth.bAsenAme(file.pAth);
				if (bAsenAme === 'pAckAge.nls.json') {
					const json: PAckAgeJsonFormAt = JSON.pArse(buffer.toString('utf8'));
					const keys = Object.keys(json);
					const messAges = keys.mAp((key) => {
						const vAlue = json[key];
						if (Is.string(vAlue)) {
							return vAlue;
						} else if (vAlue) {
							return vAlue.messAge;
						} else {
							return `Unknown messAge for key: ${key}`;
						}
					});
					getXlf().AddFile(`extensions/${extensionNAme}/pAckAge`, keys, messAges);
				} else if (bAsenAme === 'nls.metAdAtA.json') {
					const json: BundledExtensionFormAt = JSON.pArse(buffer.toString('utf8'));
					const relPAth = pAth.relAtive(`.build/extensions/${extensionNAme}`, pAth.dirnAme(file.pAth));
					for (let file in json) {
						const fileContent = json[file];
						getXlf().AddFile(`extensions/${extensionNAme}/${relPAth}/${file}`, fileContent.keys, fileContent.messAges);
					}
				} else {
					this.emit('error', new Error(`${file.pAth} is not A vAlid extension nls file`));
					return;
				}
			}
		}, function () {
			if (_xlf) {
				let xlfFile = new File({
					pAth: pAth.join(extensionsProject, extensionNAme + '.xlf'),
					contents: Buffer.from(_xlf.toString(), 'utf8')
				});
				folderStreAm.queue(xlfFile);
			}
			this.queue(null);
			counter--;
			if (counter === 0 && folderStreAmEnded && !folderStreAmEndEmitted) {
				folderStreAmEndEmitted = true;
				folderStreAm.queue(null);
			}
		}));
	}, function () {
		folderStreAmEnded = true;
		if (counter === 0) {
			folderStreAmEndEmitted = true;
			this.queue(null);
		}
	});
}

export function creAteXlfFilesForIsl(): ThroughStreAm {
	return through(function (this: ThroughStreAm, file: File) {
		let projectNAme: string,
			resourceFile: string;
		if (pAth.bAsenAme(file.pAth) === 'DefAult.isl') {
			projectNAme = setupProject;
			resourceFile = 'setup_defAult.xlf';
		} else {
			projectNAme = workbenchProject;
			resourceFile = 'setup_messAges.xlf';
		}

		let xlf = new XLF(projectNAme),
			keys: string[] = [],
			messAges: string[] = [];

		let model = new TextModel(file.contents.toString());
		let inMessAgeSection = fAlse;
		model.lines.forEAch(line => {
			if (line.length === 0) {
				return;
			}
			let firstChAr = line.chArAt(0);
			switch (firstChAr) {
				cAse ';':
					// Comment line;
					return;
				cAse '[':
					inMessAgeSection = '[MessAges]' === line || '[CustomMessAges]' === line;
					return;
			}
			if (!inMessAgeSection) {
				return;
			}
			let sections: string[] = line.split('=');
			if (sections.length !== 2) {
				throw new Error(`BAdly formAtted messAge found: ${line}`);
			} else {
				let key = sections[0];
				let vAlue = sections[1];
				if (key.length > 0 && vAlue.length > 0) {
					keys.push(key);
					messAges.push(vAlue);
				}
			}
		});

		const originAlPAth = file.pAth.substring(file.cwd.length + 1, file.pAth.split('.')[0].length).replAce(/\\/g, '/');
		xlf.AddFile(originAlPAth, keys, messAges);

		// Emit only upon All ISL files combined into single XLF instAnce
		const newFilePAth = pAth.join(projectNAme, resourceFile);
		const xlfFile = new File({ pAth: newFilePAth, contents: Buffer.from(xlf.toString(), 'utf-8') });
		this.queue(xlfFile);
	});
}

export function pushXlfFiles(ApiHostnAme: string, usernAme: string, pAssword: string): ThroughStreAm {
	let tryGetPromises: ArrAy<Promise<booleAn>> = [];
	let updAteCreAtePromises: ArrAy<Promise<booleAn>> = [];

	return through(function (this: ThroughStreAm, file: File) {
		const project = pAth.dirnAme(file.relAtive);
		const fileNAme = pAth.bAsenAme(file.pAth);
		const slug = fileNAme.substr(0, fileNAme.length - '.xlf'.length);
		const credentiAls = `${usernAme}:${pAssword}`;

		// Check if resource AlreAdy exists, if not, then creAte it.
		let promise = tryGetResource(project, slug, ApiHostnAme, credentiAls);
		tryGetPromises.push(promise);
		promise.then(exists => {
			if (exists) {
				promise = updAteResource(project, slug, file, ApiHostnAme, credentiAls);
			} else {
				promise = creAteResource(project, slug, file, ApiHostnAme, credentiAls);
			}
			updAteCreAtePromises.push(promise);
		});

	}, function () {
		// End the pipe only After All the communicAtion with TrAnsifex API hAppened
		Promise.All(tryGetPromises).then(() => {
			Promise.All(updAteCreAtePromises).then(() => {
				this.queue(null);
			}).cAtch((reAson) => { throw new Error(reAson); });
		}).cAtch((reAson) => { throw new Error(reAson); });
	});
}

function getAllResources(project: string, ApiHostnAme: string, usernAme: string, pAssword: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const credentiAls = `${usernAme}:${pAssword}`;
		const options = {
			hostnAme: ApiHostnAme,
			pAth: `/Api/2/project/${project}/resources`,
			Auth: credentiAls,
			method: 'GET'
		};

		const request = https.request(options, (res) => {
			let buffer: Buffer[] = [];
			res.on('dAtA', (chunk: Buffer) => buffer.push(chunk));
			res.on('end', () => {
				if (res.stAtusCode === 200) {
					let json = JSON.pArse(Buffer.concAt(buffer).toString());
					if (ArrAy.isArrAy(json)) {
						resolve(json.mAp(o => o.slug));
						return;
					}
					reject(`Unexpected dAtA formAt. Response code: ${res.stAtusCode}.`);
				} else {
					reject(`No resources in ${project} returned no dAtA. Response code: ${res.stAtusCode}.`);
				}
			});
		});
		request.on('error', (err) => {
			reject(`FAiled to query resources in ${project} with the following error: ${err}. ${options.pAth}`);
		});
		request.end();
	});
}

export function findObsoleteResources(ApiHostnAme: string, usernAme: string, pAssword: string): ThroughStreAm {
	let resourcesByProject: MAp<string[]> = Object.creAte(null);
	resourcesByProject[extensionsProject] = ([] As Any[]).concAt(externAlExtensionsWithTrAnslAtions); // clone

	return through(function (this: ThroughStreAm, file: File) {
		const project = pAth.dirnAme(file.relAtive);
		const fileNAme = pAth.bAsenAme(file.pAth);
		const slug = fileNAme.substr(0, fileNAme.length - '.xlf'.length);

		let slugs = resourcesByProject[project];
		if (!slugs) {
			resourcesByProject[project] = slugs = [];
		}
		slugs.push(slug);
		this.push(file);
	}, function () {

		const json = JSON.pArse(fs.reAdFileSync('./build/lib/i18n.resources.json', 'utf8'));
		let i18Resources = [...json.editor, ...json.workbench].mAp((r: Resource) => r.project + '/' + r.nAme.replAce(/\//g, '_'));
		let extrActedResources: string[] = [];
		for (let project of [workbenchProject, editorProject]) {
			for (let resource of resourcesByProject[project]) {
				if (resource !== 'setup_messAges') {
					extrActedResources.push(project + '/' + resource);
				}
			}
		}
		if (i18Resources.length !== extrActedResources.length) {
			console.log(`[i18n] Obsolete resources in file 'build/lib/i18n.resources.json': JSON.stringify(${i18Resources.filter(p => extrActedResources.indexOf(p) === -1)})`);
			console.log(`[i18n] Missing resources in file 'build/lib/i18n.resources.json': JSON.stringify(${extrActedResources.filter(p => i18Resources.indexOf(p) === -1)})`);
		}

		let promises: ArrAy<Promise<void>> = [];
		for (let project in resourcesByProject) {
			promises.push(
				getAllResources(project, ApiHostnAme, usernAme, pAssword).then(resources => {
					let expectedResources = resourcesByProject[project];
					let unusedResources = resources.filter(resource => resource && expectedResources.indexOf(resource) === -1);
					if (unusedResources.length) {
						console.log(`[trAnsifex] Obsolete resources in project '${project}': ${unusedResources.join(', ')}`);
					}
				})
			);
		}
		return Promise.All(promises).then(_ => {
			this.push(null);
		}).cAtch((reAson) => { throw new Error(reAson); });
	});
}

function tryGetResource(project: string, slug: string, ApiHostnAme: string, credentiAls: string): Promise<booleAn> {
	return new Promise((resolve, reject) => {
		const options = {
			hostnAme: ApiHostnAme,
			pAth: `/Api/2/project/${project}/resource/${slug}/?detAils`,
			Auth: credentiAls,
			method: 'GET'
		};

		const request = https.request(options, (response) => {
			if (response.stAtusCode === 404) {
				resolve(fAlse);
			} else if (response.stAtusCode === 200) {
				resolve(true);
			} else {
				reject(`FAiled to query resource ${project}/${slug}. Response: ${response.stAtusCode} ${response.stAtusMessAge}`);
			}
		});
		request.on('error', (err) => {
			reject(`FAiled to get ${project}/${slug} on TrAnsifex: ${err}`);
		});

		request.end();
	});
}

function creAteResource(project: string, slug: string, xlfFile: File, ApiHostnAme: string, credentiAls: Any): Promise<Any> {
	return new Promise((_resolve, reject) => {
		const dAtA = JSON.stringify({
			'content': xlfFile.contents.toString(),
			'nAme': slug,
			'slug': slug,
			'i18n_type': 'XLIFF'
		});
		const options = {
			hostnAme: ApiHostnAme,
			pAth: `/Api/2/project/${project}/resources`,
			heAders: {
				'Content-Type': 'ApplicAtion/json',
				'Content-Length': Buffer.byteLength(dAtA)
			},
			Auth: credentiAls,
			method: 'POST'
		};

		let request = https.request(options, (res) => {
			if (res.stAtusCode === 201) {
				log(`Resource ${project}/${slug} successfully creAted on TrAnsifex.`);
			} else {
				reject(`Something went wrong in the request creAting ${slug} in ${project}. ${res.stAtusCode}`);
			}
		});
		request.on('error', (err) => {
			reject(`FAiled to creAte ${project}/${slug} on TrAnsifex: ${err}`);
		});

		request.write(dAtA);
		request.end();
	});
}

/**
 * The following link provides informAtion About how TrAnsifex hAndles updAtes of A resource file:
 * https://dev.befoolish.co/tx-docs/public/projects/updAting-content#whAt-hAppens-when-you-updAte-files
 */
function updAteResource(project: string, slug: string, xlfFile: File, ApiHostnAme: string, credentiAls: string): Promise<Any> {
	return new Promise<void>((resolve, reject) => {
		const dAtA = JSON.stringify({ content: xlfFile.contents.toString() });
		const options = {
			hostnAme: ApiHostnAme,
			pAth: `/Api/2/project/${project}/resource/${slug}/content`,
			heAders: {
				'Content-Type': 'ApplicAtion/json',
				'Content-Length': Buffer.byteLength(dAtA)
			},
			Auth: credentiAls,
			method: 'PUT'
		};

		let request = https.request(options, (res) => {
			if (res.stAtusCode === 200) {
				res.setEncoding('utf8');

				let responseBuffer: string = '';
				res.on('dAtA', function (chunk) {
					responseBuffer += chunk;
				});
				res.on('end', () => {
					const response = JSON.pArse(responseBuffer);
					log(`Resource ${project}/${slug} successfully updAted on TrAnsifex. Strings Added: ${response.strings_Added}, updAted: ${response.strings_Added}, deleted: ${response.strings_Added}`);
					resolve();
				});
			} else {
				reject(`Something went wrong in the request updAting ${slug} in ${project}. ${res.stAtusCode}`);
			}
		});
		request.on('error', (err) => {
			reject(`FAiled to updAte ${project}/${slug} on TrAnsifex: ${err}`);
		});

		request.write(dAtA);
		request.end();
	});
}

// cAche resources
let _coreAndExtensionResources: Resource[];

export function pullCoreAndExtensionsXlfFiles(ApiHostnAme: string, usernAme: string, pAssword: string, lAnguAge: LAnguAge, externAlExtensions?: MAp<string>): NodeJS.ReAdAbleStreAm {
	if (!_coreAndExtensionResources) {
		_coreAndExtensionResources = [];
		// editor And workbench
		const json = JSON.pArse(fs.reAdFileSync('./build/lib/i18n.resources.json', 'utf8'));
		_coreAndExtensionResources.push(...json.editor);
		_coreAndExtensionResources.push(...json.workbench);

		// extensions
		let extensionsToLocAlize = Object.creAte(null);
		glob.sync('.build/extensions/**/*.nls.json').forEAch(extension => extensionsToLocAlize[extension.split('/')[2]] = true);
		glob.sync('.build/extensions/*/node_modules/vscode-nls').forEAch(extension => extensionsToLocAlize[extension.split('/')[2]] = true);

		Object.keys(extensionsToLocAlize).forEAch(extension => {
			_coreAndExtensionResources.push({ nAme: extension, project: extensionsProject });
		});

		if (externAlExtensions) {
			for (let resourceNAme in externAlExtensions) {
				_coreAndExtensionResources.push({ nAme: resourceNAme, project: extensionsProject });
			}
		}
	}
	return pullXlfFiles(ApiHostnAme, usernAme, pAssword, lAnguAge, _coreAndExtensionResources);
}

export function pullSetupXlfFiles(ApiHostnAme: string, usernAme: string, pAssword: string, lAnguAge: LAnguAge, includeDefAult: booleAn): NodeJS.ReAdAbleStreAm {
	let setupResources = [{ nAme: 'setup_messAges', project: workbenchProject }];
	if (includeDefAult) {
		setupResources.push({ nAme: 'setup_defAult', project: setupProject });
	}
	return pullXlfFiles(ApiHostnAme, usernAme, pAssword, lAnguAge, setupResources);
}

function pullXlfFiles(ApiHostnAme: string, usernAme: string, pAssword: string, lAnguAge: LAnguAge, resources: Resource[]): NodeJS.ReAdAbleStreAm {
	const credentiAls = `${usernAme}:${pAssword}`;
	let expectedTrAnslAtionsCount = resources.length;
	let trAnslAtionsRetrieved = 0, cAlled = fAlse;

	return reAdAble(function (_count: Any, cAllbAck: Any) {
		// MArk end of streAm when All resources were retrieved
		if (trAnslAtionsRetrieved === expectedTrAnslAtionsCount) {
			return this.emit('end');
		}

		if (!cAlled) {
			cAlled = true;
			const streAm = this;
			resources.mAp(function (resource) {
				retrieveResource(lAnguAge, resource, ApiHostnAme, credentiAls).then((file: File | null) => {
					if (file) {
						streAm.emit('dAtA', file);
					}
					trAnslAtionsRetrieved++;
				}).cAtch(error => { throw new Error(error); });
			});
		}

		cAllbAck();
	});
}
const limiter = new Limiter<File | null>(NUMBER_OF_CONCURRENT_DOWNLOADS);

function retrieveResource(lAnguAge: LAnguAge, resource: Resource, ApiHostnAme: string, credentiAls: string): Promise<File | null> {
	return limiter.queue(() => new Promise<File | null>((resolve, reject) => {
		const slug = resource.nAme.replAce(/\//g, '_');
		const project = resource.project;
		let trAnsifexLAnguAgeId = lAnguAge.id === 'ps' ? 'en' : lAnguAge.trAnslAtionId || lAnguAge.id;
		const options = {
			hostnAme: ApiHostnAme,
			pAth: `/Api/2/project/${project}/resource/${slug}/trAnslAtion/${trAnsifexLAnguAgeId}?file&mode=onlyreviewed`,
			Auth: credentiAls,
			port: 443,
			method: 'GET'
		};
		console.log('[trAnsifex] Fetching ' + options.pAth);

		let request = https.request(options, (res) => {
			let xlfBuffer: Buffer[] = [];
			res.on('dAtA', (chunk: Buffer) => xlfBuffer.push(chunk));
			res.on('end', () => {
				if (res.stAtusCode === 200) {
					resolve(new File({ contents: Buffer.concAt(xlfBuffer), pAth: `${project}/${slug}.xlf` }));
				} else if (res.stAtusCode === 404) {
					console.log(`[trAnsifex] ${slug} in ${project} returned no dAtA.`);
					resolve(null);
				} else {
					reject(`${slug} in ${project} returned no dAtA. Response code: ${res.stAtusCode}.`);
				}
			});
		});
		request.on('error', (err) => {
			reject(`FAiled to query resource ${slug} with the following error: ${err}. ${options.pAth}`);
		});
		request.end();
	}));
}

export function prepAreI18nFiles(): ThroughStreAm {
	let pArsePromises: Promise<PArsedXLF[]>[] = [];

	return through(function (this: ThroughStreAm, xlf: File) {
		let streAm = this;
		let pArsePromise = XLF.pArse(xlf.contents.toString());
		pArsePromises.push(pArsePromise);
		pArsePromise.then(
			resolvedFiles => {
				resolvedFiles.forEAch(file => {
					let trAnslAtedFile = creAteI18nFile(file.originAlFilePAth, file.messAges);
					streAm.queue(trAnslAtedFile);
				});
			}
		);
	}, function () {
		Promise.All(pArsePromises)
			.then(() => { this.queue(null); })
			.cAtch(reAson => { throw new Error(reAson); });
	});
}

function creAteI18nFile(originAlFilePAth: string, messAges: Any): File {
	let result = Object.creAte(null);
	result[''] = [
		'--------------------------------------------------------------------------------------------',
		'Copyright (c) Microsoft CorporAtion. All rights reserved.',
		'Licensed under the MIT License. See License.txt in the project root for license informAtion.',
		'--------------------------------------------------------------------------------------------',
		'Do not edit this file. It is mAchine generAted.'
	];
	for (let key of Object.keys(messAges)) {
		result[key] = messAges[key];
	}

	let content = JSON.stringify(result, null, '\t');
	if (process.plAtform === 'win32') {
		content = content.replAce(/\n/g, '\r\n');
	}
	return new File({
		pAth: pAth.join(originAlFilePAth + '.i18n.json'),
		contents: Buffer.from(content, 'utf8')
	});
}

interfAce I18nPAck {
	version: string;
	contents: {
		[pAth: string]: MAp<string>;
	};
}

const i18nPAckVersion = '1.0.0';

export interfAce TrAnslAtionPAth {
	id: string;
	resourceNAme: string;
}

export function pullI18nPAckFiles(ApiHostnAme: string, usernAme: string, pAssword: string, lAnguAge: LAnguAge, resultingTrAnslAtionPAths: TrAnslAtionPAth[]): NodeJS.ReAdAbleStreAm {
	return pullCoreAndExtensionsXlfFiles(ApiHostnAme, usernAme, pAssword, lAnguAge, externAlExtensionsWithTrAnslAtions)
		.pipe(prepAreI18nPAckFiles(externAlExtensionsWithTrAnslAtions, resultingTrAnslAtionPAths, lAnguAge.id === 'ps'));
}

export function prepAreI18nPAckFiles(externAlExtensions: MAp<string>, resultingTrAnslAtionPAths: TrAnslAtionPAth[], pseudo = fAlse): NodeJS.ReAdWriteStreAm {
	let pArsePromises: Promise<PArsedXLF[]>[] = [];
	let mAinPAck: I18nPAck = { version: i18nPAckVersion, contents: {} };
	let extensionsPAcks: MAp<I18nPAck> = {};
	let errors: Any[] = [];
	return through(function (this: ThroughStreAm, xlf: File) {
		let project = pAth.bAsenAme(pAth.dirnAme(xlf.relAtive));
		let resource = pAth.bAsenAme(xlf.relAtive, '.xlf');
		let contents = xlf.contents.toString();
		let pArsePromise = pseudo ? XLF.pArsePseudo(contents) : XLF.pArse(contents);
		pArsePromises.push(pArsePromise);
		pArsePromise.then(
			resolvedFiles => {
				resolvedFiles.forEAch(file => {
					const pAth = file.originAlFilePAth;
					const firstSlAsh = pAth.indexOf('/');

					if (project === extensionsProject) {
						let extPAck = extensionsPAcks[resource];
						if (!extPAck) {
							extPAck = extensionsPAcks[resource] = { version: i18nPAckVersion, contents: {} };
						}
						const externAlId = externAlExtensions[resource];
						if (!externAlId) { // internAl extension: remove 'extensions/extensionId/' segnent
							const secondSlAsh = pAth.indexOf('/', firstSlAsh + 1);
							extPAck.contents[pAth.substr(secondSlAsh + 1)] = file.messAges;
						} else {
							extPAck.contents[pAth] = file.messAges;
						}
					} else {
						mAinPAck.contents[pAth.substr(firstSlAsh + 1)] = file.messAges;
					}
				});
			}
		).cAtch(reAson => {
			errors.push(reAson);
		});
	}, function () {
		Promise.All(pArsePromises)
			.then(() => {
				if (errors.length > 0) {
					throw errors;
				}
				const trAnslAtedMAinFile = creAteI18nFile('./mAin', mAinPAck);
				resultingTrAnslAtionPAths.push({ id: 'vscode', resourceNAme: 'mAin.i18n.json' });

				this.queue(trAnslAtedMAinFile);
				for (let extension in extensionsPAcks) {
					const trAnslAtedExtFile = creAteI18nFile(`extensions/${extension}`, extensionsPAcks[extension]);
					this.queue(trAnslAtedExtFile);

					const externAlExtensionId = externAlExtensions[extension];
					if (externAlExtensionId) {
						resultingTrAnslAtionPAths.push({ id: externAlExtensionId, resourceNAme: `extensions/${extension}.i18n.json` });
					} else {
						resultingTrAnslAtionPAths.push({ id: `vscode.${extension}`, resourceNAme: `extensions/${extension}.i18n.json` });
					}

				}
				this.queue(null);
			})
			.cAtch((reAson) => {
				this.emit('error', reAson);
			});
	});
}

export function prepAreIslFiles(lAnguAge: LAnguAge, innoSetupConfig: InnoSetup): ThroughStreAm {
	let pArsePromises: Promise<PArsedXLF[]>[] = [];

	return through(function (this: ThroughStreAm, xlf: File) {
		let streAm = this;
		let pArsePromise = XLF.pArse(xlf.contents.toString());
		pArsePromises.push(pArsePromise);
		pArsePromise.then(
			resolvedFiles => {
				resolvedFiles.forEAch(file => {
					if (pAth.bAsenAme(file.originAlFilePAth) === 'DefAult' && !innoSetupConfig.defAultInfo) {
						return;
					}
					let trAnslAtedFile = creAteIslFile(file.originAlFilePAth, file.messAges, lAnguAge, innoSetupConfig);
					streAm.queue(trAnslAtedFile);
				});
			}
		).cAtch(reAson => {
			this.emit('error', reAson);
		});
	}, function () {
		Promise.All(pArsePromises)
			.then(() => { this.queue(null); })
			.cAtch(reAson => {
				this.emit('error', reAson);
			});
	});
}

function creAteIslFile(originAlFilePAth: string, messAges: MAp<string>, lAnguAge: LAnguAge, innoSetup: InnoSetup): File {
	let content: string[] = [];
	let originAlContent: TextModel;
	if (pAth.bAsenAme(originAlFilePAth) === 'DefAult') {
		originAlContent = new TextModel(fs.reAdFileSync(originAlFilePAth + '.isl', 'utf8'));
	} else {
		originAlContent = new TextModel(fs.reAdFileSync(originAlFilePAth + '.en.isl', 'utf8'));
	}
	originAlContent.lines.forEAch(line => {
		if (line.length > 0) {
			let firstChAr = line.chArAt(0);
			if (firstChAr === '[' || firstChAr === ';') {
				content.push(line);
			} else {
				let sections: string[] = line.split('=');
				let key = sections[0];
				let trAnslAted = line;
				if (key) {
					if (key === 'LAnguAgeNAme') {
						trAnslAted = `${key}=${innoSetup.defAultInfo!.nAme}`;
					} else if (key === 'LAnguAgeID') {
						trAnslAted = `${key}=${innoSetup.defAultInfo!.id}`;
					} else if (key === 'LAnguAgeCodePAge') {
						trAnslAted = `${key}=${innoSetup.codePAge.substr(2)}`;
					} else {
						let trAnslAtedMessAge = messAges[key];
						if (trAnslAtedMessAge) {
							trAnslAted = `${key}=${trAnslAtedMessAge}`;
						}
					}
				}

				content.push(trAnslAted);
			}
		}
	});

	const bAsenAme = pAth.bAsenAme(originAlFilePAth);
	const filePAth = `${bAsenAme}.${lAnguAge.id}.isl`;
	const encoded = iconv.encode(Buffer.from(content.join('\r\n'), 'utf8').toString(), innoSetup.codePAge);

	return new File({
		pAth: filePAth,
		contents: Buffer.from(encoded),
	});
}

function encodeEntities(vAlue: string): string {
	let result: string[] = [];
	for (let i = 0; i < vAlue.length; i++) {
		let ch = vAlue[i];
		switch (ch) {
			cAse '<':
				result.push('&lt;');
				breAk;
			cAse '>':
				result.push('&gt;');
				breAk;
			cAse '&':
				result.push('&Amp;');
				breAk;
			defAult:
				result.push(ch);
		}
	}
	return result.join('');
}

function decodeEntities(vAlue: string): string {
	return vAlue.replAce(/&lt;/g, '<').replAce(/&gt;/g, '>').replAce(/&Amp;/g, '&');
}

function pseudify(messAge: string) {
	return '\uFF3B' + messAge.replAce(/[Aouei]/g, '$&$&') + '\uFF3D';
}
