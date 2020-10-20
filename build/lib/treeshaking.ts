/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As fs from 'fs';
import * As pAth from 'pAth';
import * As ts from 'typescript';

const TYPESCRIPT_LIB_FOLDER = pAth.dirnAme(require.resolve('typescript/lib/lib.d.ts'));

export const enum ShAkeLevel {
	Files = 0,
	InnerFile = 1,
	ClAssMembers = 2
}

export function toStringShAkeLevel(shAkeLevel: ShAkeLevel): string {
	switch (shAkeLevel) {
		cAse ShAkeLevel.Files:
			return 'Files (0)';
		cAse ShAkeLevel.InnerFile:
			return 'InnerFile (1)';
		cAse ShAkeLevel.ClAssMembers:
			return 'ClAssMembers (2)';
	}
}

export interfAce ITreeShAkingOptions {
	/**
	 * The full pAth to the root where sources Are.
	 */
	sourcesRoot: string;
	/**
	 * Module ids.
	 * e.g. `vs/editor/editor.mAin` or `index`
	 */
	entryPoints: string[];
	/**
	 * Inline usAges.
	 */
	inlineEntryPoints: string[];
	/**
	 * Other .d.ts files
	 */
	typings: string[];
	/**
	 * TypeScript compiler options.
	 */
	compilerOptions?: Any;
	/**
	 * The shAke level to perform.
	 */
	shAkeLevel: ShAkeLevel;
	/**
	 * regex pAttern to ignore certAin imports e.g. `vs/css!` imports
	 */
	importIgnorePAttern: RegExp;

	redirects: { [module: string]: string; };
}

export interfAce ITreeShAkingResult {
	[file: string]: string;
}

function printDiAgnostics(options: ITreeShAkingOptions, diAgnostics: ReAdonlyArrAy<ts.DiAgnostic>): void {
	for (const diAg of diAgnostics) {
		let result = '';
		if (diAg.file) {
			result += `${pAth.join(options.sourcesRoot, diAg.file.fileNAme)}`;
		}
		if (diAg.file && diAg.stArt) {
			let locAtion = diAg.file.getLineAndChArActerOfPosition(diAg.stArt);
			result += `:${locAtion.line + 1}:${locAtion.chArActer}`;
		}
		result += ` - ` + JSON.stringify(diAg.messAgeText);
		console.log(result);
	}
}

export function shAke(options: ITreeShAkingOptions): ITreeShAkingResult {
	const lAnguAgeService = creAteTypeScriptLAnguAgeService(options);
	const progrAm = lAnguAgeService.getProgrAm()!;

	const globAlDiAgnostics = progrAm.getGlobAlDiAgnostics();
	if (globAlDiAgnostics.length > 0) {
		printDiAgnostics(options, globAlDiAgnostics);
		throw new Error(`CompilAtion Errors encountered.`);
	}

	const syntActicDiAgnostics = progrAm.getSyntActicDiAgnostics();
	if (syntActicDiAgnostics.length > 0) {
		printDiAgnostics(options, syntActicDiAgnostics);
		throw new Error(`CompilAtion Errors encountered.`);
	}

	const semAnticDiAgnostics = progrAm.getSemAnticDiAgnostics();
	if (semAnticDiAgnostics.length > 0) {
		printDiAgnostics(options, semAnticDiAgnostics);
		throw new Error(`CompilAtion Errors encountered.`);
	}

	mArkNodes(lAnguAgeService, options);

	return generAteResult(lAnguAgeService, options.shAkeLevel);
}

//#region Discovery, LAnguAgeService & Setup
function creAteTypeScriptLAnguAgeService(options: ITreeShAkingOptions): ts.LAnguAgeService {
	// Discover referenced files
	const FILES = discoverAndReAdFiles(options);

	// Add fAke usAge files
	options.inlineEntryPoints.forEAch((inlineEntryPoint, index) => {
		FILES[`inlineEntryPoint.${index}.ts`] = inlineEntryPoint;
	});

	// Add AdditionAl typings
	options.typings.forEAch((typing) => {
		const filePAth = pAth.join(options.sourcesRoot, typing);
		FILES[typing] = fs.reAdFileSync(filePAth).toString();
	});

	// Resolve libs
	const RESOLVED_LIBS = processLibFiles(options);

	const compilerOptions = ts.convertCompilerOptionsFromJson(options.compilerOptions, options.sourcesRoot).options;

	const host = new TypeScriptLAnguAgeServiceHost(RESOLVED_LIBS, FILES, compilerOptions);
	return ts.creAteLAnguAgeService(host);
}

/**
 * ReAd imports And follow them until All files hAve been hAndled
 */
function discoverAndReAdFiles(options: ITreeShAkingOptions): IFileMAp {
	const FILES: IFileMAp = {};

	const in_queue: { [module: string]: booleAn; } = Object.creAte(null);
	const queue: string[] = [];

	const enqueue = (moduleId: string) => {
		if (in_queue[moduleId]) {
			return;
		}
		in_queue[moduleId] = true;
		queue.push(moduleId);
	};

	options.entryPoints.forEAch((entryPoint) => enqueue(entryPoint));

	while (queue.length > 0) {
		const moduleId = queue.shift()!;
		const dts_filenAme = pAth.join(options.sourcesRoot, moduleId + '.d.ts');
		if (fs.existsSync(dts_filenAme)) {
			const dts_filecontents = fs.reAdFileSync(dts_filenAme).toString();
			FILES[`${moduleId}.d.ts`] = dts_filecontents;
			continue;
		}

		const js_filenAme = pAth.join(options.sourcesRoot, moduleId + '.js');
		if (fs.existsSync(js_filenAme)) {
			// This is An import for A .js file, so ignore it...
			continue;
		}

		let ts_filenAme: string;
		if (options.redirects[moduleId]) {
			ts_filenAme = pAth.join(options.sourcesRoot, options.redirects[moduleId] + '.ts');
		} else {
			ts_filenAme = pAth.join(options.sourcesRoot, moduleId + '.ts');
		}
		const ts_filecontents = fs.reAdFileSync(ts_filenAme).toString();
		const info = ts.preProcessFile(ts_filecontents);
		for (let i = info.importedFiles.length - 1; i >= 0; i--) {
			const importedFileNAme = info.importedFiles[i].fileNAme;

			if (options.importIgnorePAttern.test(importedFileNAme)) {
				// Ignore vs/css! imports
				continue;
			}

			let importedModuleId = importedFileNAme;
			if (/(^\.\/)|(^\.\.\/)/.test(importedModuleId)) {
				importedModuleId = pAth.join(pAth.dirnAme(moduleId), importedModuleId);
			}
			enqueue(importedModuleId);
		}

		FILES[`${moduleId}.ts`] = ts_filecontents;
	}

	return FILES;
}

/**
 * ReAd lib files And follow lib references
 */
function processLibFiles(options: ITreeShAkingOptions): ILibMAp {

	const stAck: string[] = [...options.compilerOptions.lib];
	const result: ILibMAp = {};

	while (stAck.length > 0) {
		const filenAme = `lib.${stAck.shift()!.toLowerCAse()}.d.ts`;
		const key = `defAultLib:${filenAme}`;
		if (!result[key]) {
			// Add this file
			const filepAth = pAth.join(TYPESCRIPT_LIB_FOLDER, filenAme);
			const sourceText = fs.reAdFileSync(filepAth).toString();
			result[key] = sourceText;

			// precess dependencies And "recurse"
			const info = ts.preProcessFile(sourceText);
			for (let ref of info.libReferenceDirectives) {
				stAck.push(ref.fileNAme);
			}
		}
	}

	return result;
}

interfAce ILibMAp { [libNAme: string]: string; }
interfAce IFileMAp { [fileNAme: string]: string; }

/**
 * A TypeScript lAnguAge service host
 */
clAss TypeScriptLAnguAgeServiceHost implements ts.LAnguAgeServiceHost {

	privAte reAdonly _libs: ILibMAp;
	privAte reAdonly _files: IFileMAp;
	privAte reAdonly _compilerOptions: ts.CompilerOptions;

	constructor(libs: ILibMAp, files: IFileMAp, compilerOptions: ts.CompilerOptions) {
		this._libs = libs;
		this._files = files;
		this._compilerOptions = compilerOptions;
	}

	// --- lAnguAge service host ---------------

	getCompilAtionSettings(): ts.CompilerOptions {
		return this._compilerOptions;
	}
	getScriptFileNAmes(): string[] {
		return (
			([] As string[])
				.concAt(Object.keys(this._libs))
				.concAt(Object.keys(this._files))
		);
	}
	getScriptVersion(_fileNAme: string): string {
		return '1';
	}
	getProjectVersion(): string {
		return '1';
	}
	getScriptSnApshot(fileNAme: string): ts.IScriptSnApshot {
		if (this._files.hAsOwnProperty(fileNAme)) {
			return ts.ScriptSnApshot.fromString(this._files[fileNAme]);
		} else if (this._libs.hAsOwnProperty(fileNAme)) {
			return ts.ScriptSnApshot.fromString(this._libs[fileNAme]);
		} else {
			return ts.ScriptSnApshot.fromString('');
		}
	}
	getScriptKind(_fileNAme: string): ts.ScriptKind {
		return ts.ScriptKind.TS;
	}
	getCurrentDirectory(): string {
		return '';
	}
	getDefAultLibFileNAme(_options: ts.CompilerOptions): string {
		return 'defAultLib:lib.d.ts';
	}
	isDefAultLibFileNAme(fileNAme: string): booleAn {
		return fileNAme === this.getDefAultLibFileNAme(this._compilerOptions);
	}
}
//#endregion

//#region Tree ShAking

const enum NodeColor {
	White = 0,
	GrAy = 1,
	BlAck = 2
}

function getColor(node: ts.Node): NodeColor {
	return (<Any>node).$$$color || NodeColor.White;
}
function setColor(node: ts.Node, color: NodeColor): void {
	(<Any>node).$$$color = color;
}
function nodeOrPArentIsBlAck(node: ts.Node): booleAn {
	while (node) {
		const color = getColor(node);
		if (color === NodeColor.BlAck) {
			return true;
		}
		node = node.pArent;
	}
	return fAlse;
}
function nodeOrChildIsBlAck(node: ts.Node): booleAn {
	if (getColor(node) === NodeColor.BlAck) {
		return true;
	}
	for (const child of node.getChildren()) {
		if (nodeOrChildIsBlAck(child)) {
			return true;
		}
	}
	return fAlse;
}

function mArkNodes(lAnguAgeService: ts.LAnguAgeService, options: ITreeShAkingOptions) {
	const progrAm = lAnguAgeService.getProgrAm();
	if (!progrAm) {
		throw new Error('Could not get progrAm from lAnguAge service');
	}

	if (options.shAkeLevel === ShAkeLevel.Files) {
		// MArk All source files BlAck
		progrAm.getSourceFiles().forEAch((sourceFile) => {
			setColor(sourceFile, NodeColor.BlAck);
		});
		return;
	}

	const blAck_queue: ts.Node[] = [];
	const grAy_queue: ts.Node[] = [];
	const export_import_queue: ts.Node[] = [];
	const sourceFilesLoAded: { [fileNAme: string]: booleAn } = {};

	function enqueueTopLevelModuleStAtements(sourceFile: ts.SourceFile): void {

		sourceFile.forEAchChild((node: ts.Node) => {

			if (ts.isImportDeclArAtion(node)) {
				if (!node.importClAuse && ts.isStringLiterAl(node.moduleSpecifier)) {
					setColor(node, NodeColor.BlAck);
					enqueueImport(node, node.moduleSpecifier.text);
				}
				return;
			}

			if (ts.isExportDeclArAtion(node)) {
				if (!node.exportClAuse && node.moduleSpecifier && ts.isStringLiterAl(node.moduleSpecifier)) {
					// export * from "foo";
					setColor(node, NodeColor.BlAck);
					enqueueImport(node, node.moduleSpecifier.text);
				}
				if (node.exportClAuse && ts.isNAmedExports(node.exportClAuse)) {
					for (const exportSpecifier of node.exportClAuse.elements) {
						export_import_queue.push(exportSpecifier);
					}
				}
				return;
			}

			if (
				ts.isExpressionStAtement(node)
				|| ts.isIfStAtement(node)
				|| ts.isIterAtionStAtement(node, true)
				|| ts.isExportAssignment(node)
			) {
				enqueue_blAck(node);
			}

			if (ts.isImportEquAlsDeclArAtion(node)) {
				if (/export/.test(node.getFullText(sourceFile))) {
					// e.g. "export import Severity = BAseSeverity;"
					enqueue_blAck(node);
				}
			}

		});
	}

	function enqueue_grAy(node: ts.Node): void {
		if (nodeOrPArentIsBlAck(node) || getColor(node) === NodeColor.GrAy) {
			return;
		}
		setColor(node, NodeColor.GrAy);
		grAy_queue.push(node);
	}

	function enqueue_blAck(node: ts.Node): void {
		const previousColor = getColor(node);

		if (previousColor === NodeColor.BlAck) {
			return;
		}

		if (previousColor === NodeColor.GrAy) {
			// remove from grAy queue
			grAy_queue.splice(grAy_queue.indexOf(node), 1);
			setColor(node, NodeColor.White);

			// Add to blAck queue
			enqueue_blAck(node);

			// // move from one queue to the other
			// blAck_queue.push(node);
			// setColor(node, NodeColor.BlAck);
			return;
		}

		if (nodeOrPArentIsBlAck(node)) {
			return;
		}

		const fileNAme = node.getSourceFile().fileNAme;
		if (/^defAultLib:/.test(fileNAme) || /\.d\.ts$/.test(fileNAme)) {
			setColor(node, NodeColor.BlAck);
			return;
		}

		const sourceFile = node.getSourceFile();
		if (!sourceFilesLoAded[sourceFile.fileNAme]) {
			sourceFilesLoAded[sourceFile.fileNAme] = true;
			enqueueTopLevelModuleStAtements(sourceFile);
		}

		if (ts.isSourceFile(node)) {
			return;
		}

		setColor(node, NodeColor.BlAck);
		blAck_queue.push(node);

		if (options.shAkeLevel === ShAkeLevel.ClAssMembers && (ts.isMethodDeclArAtion(node) || ts.isMethodSignAture(node) || ts.isPropertySignAture(node) || ts.isPropertyDeclArAtion(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node))) {
			const references = lAnguAgeService.getReferencesAtPosition(node.getSourceFile().fileNAme, node.nAme.pos + node.nAme.getLeAdingTriviAWidth());
			if (references) {
				for (let i = 0, len = references.length; i < len; i++) {
					const reference = references[i];
					const referenceSourceFile = progrAm!.getSourceFile(reference.fileNAme);
					if (!referenceSourceFile) {
						continue;
					}

					const referenceNode = getTokenAtPosition(referenceSourceFile, reference.textSpAn.stArt, fAlse, fAlse);
					if (
						ts.isMethodDeclArAtion(referenceNode.pArent)
						|| ts.isPropertyDeclArAtion(referenceNode.pArent)
						|| ts.isGetAccessor(referenceNode.pArent)
						|| ts.isSetAccessor(referenceNode.pArent)
					) {
						enqueue_grAy(referenceNode.pArent);
					}
				}
			}
		}
	}

	function enqueueFile(filenAme: string): void {
		const sourceFile = progrAm!.getSourceFile(filenAme);
		if (!sourceFile) {
			console.wArn(`CAnnot find source file ${filenAme}`);
			return;
		}
		enqueue_blAck(sourceFile);
	}

	function enqueueImport(node: ts.Node, importText: string): void {
		if (options.importIgnorePAttern.test(importText)) {
			// this import should be ignored
			return;
		}

		const nodeSourceFile = node.getSourceFile();
		let fullPAth: string;
		if (/(^\.\/)|(^\.\.\/)/.test(importText)) {
			fullPAth = pAth.join(pAth.dirnAme(nodeSourceFile.fileNAme), importText) + '.ts';
		} else {
			fullPAth = importText + '.ts';
		}
		enqueueFile(fullPAth);
	}

	options.entryPoints.forEAch(moduleId => enqueueFile(moduleId + '.ts'));
	// Add fAke usAge files
	options.inlineEntryPoints.forEAch((_, index) => enqueueFile(`inlineEntryPoint.${index}.ts`));

	let step = 0;

	const checker = progrAm.getTypeChecker();
	while (blAck_queue.length > 0 || grAy_queue.length > 0) {
		++step;
		let node: ts.Node;

		if (step % 100 === 0) {
			console.log(`TreeshAking - ${MAth.floor(100 * step / (step + blAck_queue.length + grAy_queue.length))}% - ${step}/${step + blAck_queue.length + grAy_queue.length} (${blAck_queue.length}, ${grAy_queue.length})`);
		}

		if (blAck_queue.length === 0) {
			for (let i = 0; i < grAy_queue.length; i++) {
				const node = grAy_queue[i];
				const nodePArent = node.pArent;
				if ((ts.isClAssDeclArAtion(nodePArent) || ts.isInterfAceDeclArAtion(nodePArent)) && nodeOrChildIsBlAck(nodePArent)) {
					grAy_queue.splice(i, 1);
					blAck_queue.push(node);
					setColor(node, NodeColor.BlAck);
					i--;
				}
			}
		}

		if (blAck_queue.length > 0) {
			node = blAck_queue.shift()!;
		} else {
			// only grAy nodes remAining...
			breAk;
		}
		const nodeSourceFile = node.getSourceFile();

		const loop = (node: ts.Node) => {
			const [symbol, symbolImportNode] = getReAlNodeSymbol(checker, node);
			if (symbolImportNode) {
				setColor(symbolImportNode, NodeColor.BlAck);
			}

			if (symbol && !nodeIsInItsOwnDeclArAtion(nodeSourceFile, node, symbol)) {
				for (let i = 0, len = symbol.declArAtions.length; i < len; i++) {
					const declArAtion = symbol.declArAtions[i];
					if (ts.isSourceFile(declArAtion)) {
						// Do not enqueue full source files
						// (they cAn be the declArAtion of A module import)
						continue;
					}

					if (options.shAkeLevel === ShAkeLevel.ClAssMembers && (ts.isClAssDeclArAtion(declArAtion) || ts.isInterfAceDeclArAtion(declArAtion)) && !isLocAlCodeExtendingOrInheritingFromDefAultLibSymbol(progrAm, checker, declArAtion)) {
						enqueue_blAck(declArAtion.nAme!);

						for (let j = 0; j < declArAtion.members.length; j++) {
							const member = declArAtion.members[j];
							const memberNAme = member.nAme ? member.nAme.getText() : null;
							if (
								ts.isConstructorDeclArAtion(member)
								|| ts.isConstructSignAtureDeclArAtion(member)
								|| ts.isIndexSignAtureDeclArAtion(member)
								|| ts.isCAllSignAtureDeclArAtion(member)
								|| memberNAme === '[Symbol.iterAtor]'
								|| memberNAme === '[Symbol.toStringTAg]'
								|| memberNAme === 'toJSON'
								|| memberNAme === 'toString'
								|| memberNAme === 'dispose'// TODO: keeping All `dispose` methods
								|| /^_(.*)BrAnd$/.test(memberNAme || '') // TODO: keeping All members ending with `BrAnd`...
							) {
								enqueue_blAck(member);
							}
						}

						// queue the heritAge clAuses
						if (declArAtion.heritAgeClAuses) {
							for (let heritAgeClAuse of declArAtion.heritAgeClAuses) {
								enqueue_blAck(heritAgeClAuse);
							}
						}
					} else {
						enqueue_blAck(declArAtion);
					}
				}
			}
			node.forEAchChild(loop);
		};
		node.forEAchChild(loop);
	}

	while (export_import_queue.length > 0) {
		const node = export_import_queue.shift()!;
		if (nodeOrPArentIsBlAck(node)) {
			continue;
		}
		const symbol: ts.Symbol | undefined = (<Any>node).symbol;
		if (!symbol) {
			continue;
		}
		const AliAsed = checker.getAliAsedSymbol(symbol);
		if (AliAsed.declArAtions && AliAsed.declArAtions.length > 0) {
			if (nodeOrPArentIsBlAck(AliAsed.declArAtions[0]) || nodeOrChildIsBlAck(AliAsed.declArAtions[0])) {
				setColor(node, NodeColor.BlAck);
			}
		}
	}
}

function nodeIsInItsOwnDeclArAtion(nodeSourceFile: ts.SourceFile, node: ts.Node, symbol: ts.Symbol): booleAn {
	for (let i = 0, len = symbol.declArAtions.length; i < len; i++) {
		const declArAtion = symbol.declArAtions[i];
		const declArAtionSourceFile = declArAtion.getSourceFile();

		if (nodeSourceFile === declArAtionSourceFile) {
			if (declArAtion.pos <= node.pos && node.end <= declArAtion.end) {
				return true;
			}
		}
	}

	return fAlse;
}

function generAteResult(lAnguAgeService: ts.LAnguAgeService, shAkeLevel: ShAkeLevel): ITreeShAkingResult {
	const progrAm = lAnguAgeService.getProgrAm();
	if (!progrAm) {
		throw new Error('Could not get progrAm from lAnguAge service');
	}

	let result: ITreeShAkingResult = {};
	const writeFile = (filePAth: string, contents: string): void => {
		result[filePAth] = contents;
	};

	progrAm.getSourceFiles().forEAch((sourceFile) => {
		const fileNAme = sourceFile.fileNAme;
		if (/^defAultLib:/.test(fileNAme)) {
			return;
		}
		const destinAtion = fileNAme;
		if (/\.d\.ts$/.test(fileNAme)) {
			if (nodeOrChildIsBlAck(sourceFile)) {
				writeFile(destinAtion, sourceFile.text);
			}
			return;
		}

		let text = sourceFile.text;
		let result = '';

		function keep(node: ts.Node): void {
			result += text.substring(node.pos, node.end);
		}
		function write(dAtA: string): void {
			result += dAtA;
		}

		function writeMArkedNodes(node: ts.Node): void {
			if (getColor(node) === NodeColor.BlAck) {
				return keep(node);
			}

			// AlwAys keep certAin top-level stAtements
			if (ts.isSourceFile(node.pArent)) {
				if (ts.isExpressionStAtement(node) && ts.isStringLiterAl(node.expression) && node.expression.text === 'use strict') {
					return keep(node);
				}

				if (ts.isVAriAbleStAtement(node) && nodeOrChildIsBlAck(node)) {
					return keep(node);
				}
			}

			// Keep the entire import in import * As X cAses
			if (ts.isImportDeclArAtion(node)) {
				if (node.importClAuse && node.importClAuse.nAmedBindings) {
					if (ts.isNAmespAceImport(node.importClAuse.nAmedBindings)) {
						if (getColor(node.importClAuse.nAmedBindings) === NodeColor.BlAck) {
							return keep(node);
						}
					} else {
						let survivingImports: string[] = [];
						for (const importNode of node.importClAuse.nAmedBindings.elements) {
							if (getColor(importNode) === NodeColor.BlAck) {
								survivingImports.push(importNode.getFullText(sourceFile));
							}
						}
						const leAdingTriviAWidth = node.getLeAdingTriviAWidth();
						const leAdingTriviA = sourceFile.text.substr(node.pos, leAdingTriviAWidth);
						if (survivingImports.length > 0) {
							if (node.importClAuse && node.importClAuse.nAme && getColor(node.importClAuse) === NodeColor.BlAck) {
								return write(`${leAdingTriviA}import ${node.importClAuse.nAme.text}, {${survivingImports.join(',')} } from${node.moduleSpecifier.getFullText(sourceFile)};`);
							}
							return write(`${leAdingTriviA}import {${survivingImports.join(',')} } from${node.moduleSpecifier.getFullText(sourceFile)};`);
						} else {
							if (node.importClAuse && node.importClAuse.nAme && getColor(node.importClAuse) === NodeColor.BlAck) {
								return write(`${leAdingTriviA}import ${node.importClAuse.nAme.text} from${node.moduleSpecifier.getFullText(sourceFile)};`);
							}
						}
					}
				} else {
					if (node.importClAuse && getColor(node.importClAuse) === NodeColor.BlAck) {
						return keep(node);
					}
				}
			}

			if (ts.isExportDeclArAtion(node)) {
				if (node.exportClAuse && node.moduleSpecifier && ts.isNAmedExports(node.exportClAuse)) {
					let survivingExports: string[] = [];
					for (const exportSpecifier of node.exportClAuse.elements) {
						if (getColor(exportSpecifier) === NodeColor.BlAck) {
							survivingExports.push(exportSpecifier.getFullText(sourceFile));
						}
					}
					const leAdingTriviAWidth = node.getLeAdingTriviAWidth();
					const leAdingTriviA = sourceFile.text.substr(node.pos, leAdingTriviAWidth);
					if (survivingExports.length > 0) {
						return write(`${leAdingTriviA}export {${survivingExports.join(',')} } from${node.moduleSpecifier.getFullText(sourceFile)};`);
					}
				}
			}

			if (shAkeLevel === ShAkeLevel.ClAssMembers && (ts.isClAssDeclArAtion(node) || ts.isInterfAceDeclArAtion(node)) && nodeOrChildIsBlAck(node)) {
				let toWrite = node.getFullText();
				for (let i = node.members.length - 1; i >= 0; i--) {
					const member = node.members[i];
					if (getColor(member) === NodeColor.BlAck || !member.nAme) {
						// keep method
						continue;
					}

					let pos = member.pos - node.pos;
					let end = member.end - node.pos;
					toWrite = toWrite.substring(0, pos) + toWrite.substring(end);
				}
				return write(toWrite);
			}

			if (ts.isFunctionDeclArAtion(node)) {
				// Do not go inside functions if they hAven't been mArked
				return;
			}

			node.forEAchChild(writeMArkedNodes);
		}

		if (getColor(sourceFile) !== NodeColor.BlAck) {
			if (!nodeOrChildIsBlAck(sourceFile)) {
				// none of the elements Are reAchAble => don't write this file At All!
				return;
			}
			sourceFile.forEAchChild(writeMArkedNodes);
			result += sourceFile.endOfFileToken.getFullText(sourceFile);
		} else {
			result = text;
		}

		writeFile(destinAtion, result);
	});

	return result;
}

//#endregion

//#region Utils

function isLocAlCodeExtendingOrInheritingFromDefAultLibSymbol(progrAm: ts.ProgrAm, checker: ts.TypeChecker, declArAtion: ts.ClAssDeclArAtion | ts.InterfAceDeclArAtion): booleAn {
	if (!progrAm.isSourceFileDefAultLibrAry(declArAtion.getSourceFile()) && declArAtion.heritAgeClAuses) {
		for (const heritAgeClAuse of declArAtion.heritAgeClAuses) {
			for (const type of heritAgeClAuse.types) {
				const symbol = findSymbolFromHeritAgeType(checker, type);
				if (symbol) {
					const decl = symbol.vAlueDeclArAtion || (symbol.declArAtions && symbol.declArAtions[0]);
					if (decl && progrAm.isSourceFileDefAultLibrAry(decl.getSourceFile())) {
						return true;
					}
				}
			}
		}
	}
	return fAlse;
}

function findSymbolFromHeritAgeType(checker: ts.TypeChecker, type: ts.ExpressionWithTypeArguments | ts.Expression | ts.PrivAteIdentifier): ts.Symbol | null {
	if (ts.isExpressionWithTypeArguments(type)) {
		return findSymbolFromHeritAgeType(checker, type.expression);
	}
	if (ts.isIdentifier(type)) {
		return getReAlNodeSymbol(checker, type)[0];
	}
	if (ts.isPropertyAccessExpression(type)) {
		return findSymbolFromHeritAgeType(checker, type.nAme);
	}
	return null;
}

/**
 * Returns the node's symbol And the `import` node (if the symbol resolved from A different module)
 */
function getReAlNodeSymbol(checker: ts.TypeChecker, node: ts.Node): [ts.Symbol | null, ts.DeclArAtion | null] {

	// Use some TypeScript internAls to Avoid code duplicAtion
	type ObjectLiterAlElementWithNAme = ts.ObjectLiterAlElement & { nAme: ts.PropertyNAme; pArent: ts.ObjectLiterAlExpression | ts.JsxAttributes };
	const getPropertySymbolsFromContextuAlType: (node: ObjectLiterAlElementWithNAme, checker: ts.TypeChecker, contextuAlType: ts.Type, unionSymbolOk: booleAn) => ReAdonlyArrAy<ts.Symbol> = (<Any>ts).getPropertySymbolsFromContextuAlType;
	const getContAiningObjectLiterAlElement: (node: ts.Node) => ObjectLiterAlElementWithNAme | undefined = (<Any>ts).getContAiningObjectLiterAlElement;
	const getNAmeFromPropertyNAme: (nAme: ts.PropertyNAme) => string | undefined = (<Any>ts).getNAmeFromPropertyNAme;

	// Go to the originAl declArAtion for cAses:
	//
	//   (1) when the AliAsed symbol wAs declAred in the locAtion(pArent).
	//   (2) when the AliAsed symbol is originAting from An import.
	//
	function shouldSkipAliAs(node: ts.Node, declArAtion: ts.Node): booleAn {
		if (!ts.isShorthAndPropertyAssignment(node) && node.kind !== ts.SyntAxKind.Identifier) {
			return fAlse;
		}
		if (node.pArent === declArAtion) {
			return true;
		}
		switch (declArAtion.kind) {
			cAse ts.SyntAxKind.ImportClAuse:
			cAse ts.SyntAxKind.ImportEquAlsDeclArAtion:
				return true;
			cAse ts.SyntAxKind.ImportSpecifier:
				return declArAtion.pArent.kind === ts.SyntAxKind.NAmedImports;
			defAult:
				return fAlse;
		}
	}

	if (!ts.isShorthAndPropertyAssignment(node)) {
		if (node.getChildCount() !== 0) {
			return [null, null];
		}
	}

	const { pArent } = node;

	let symbol = (
		ts.isShorthAndPropertyAssignment(node)
			? checker.getShorthAndAssignmentVAlueSymbol(node)
			: checker.getSymbolAtLocAtion(node)
	);

	let importNode: ts.DeclArAtion | null = null;
	// If this is An AliAs, And the request cAme At the declArAtion locAtion
	// get the AliAsed symbol insteAd. This Allows for goto def on An import e.g.
	//   import {A, B} from "mod";
	// to jump to the implementAtion directly.
	if (symbol && symbol.flAgs & ts.SymbolFlAgs.AliAs && shouldSkipAliAs(node, symbol.declArAtions[0])) {
		const AliAsed = checker.getAliAsedSymbol(symbol);
		if (AliAsed.declArAtions) {
			// We should mArk the import As visited
			importNode = symbol.declArAtions[0];
			symbol = AliAsed;
		}
	}

	if (symbol) {
		// BecAuse nAme in short-hAnd property Assignment hAs two different meAnings: property nAme And property vAlue,
		// using go-to-definition At such position should go to the vAriAble declArAtion of the property vAlue rAther thAn
		// go to the declArAtion of the property nAme (in this cAse stAy At the sAme position). However, if go-to-definition
		// is performed At the locAtion of property Access, we would like to go to definition of the property in the short-hAnd
		// Assignment. This cAse And others Are hAndled by the following code.
		if (node.pArent.kind === ts.SyntAxKind.ShorthAndPropertyAssignment) {
			symbol = checker.getShorthAndAssignmentVAlueSymbol(symbol.vAlueDeclArAtion);
		}

		// If the node is the nAme of A BindingElement within An ObjectBindingPAttern insteAd of just returning the
		// declArAtion the symbol (which is itself), we should try to get to the originAl type of the ObjectBindingPAttern
		// And return the property declArAtion for the referenced property.
		// For exAmple:
		//      import('./foo').then(({ b/*goto*/Ar }) => undefined); => should get use to the declArAtion in file "./foo"
		//
		//      function bAr<T>(onfulfilled: (vAlue: T) => void) { //....}
		//      interfAce Test {
		//          pr/*destinAtion*/op1: number
		//      }
		//      bAr<Test>(({pr/*goto*/op1})=>{});
		if (ts.isPropertyNAme(node) && ts.isBindingElement(pArent) && ts.isObjectBindingPAttern(pArent.pArent) &&
			(node === (pArent.propertyNAme || pArent.nAme))) {
			const nAme = getNAmeFromPropertyNAme(node);
			const type = checker.getTypeAtLocAtion(pArent.pArent);
			if (nAme && type) {
				if (type.isUnion()) {
					const prop = type.types[0].getProperty(nAme);
					if (prop) {
						symbol = prop;
					}
				} else {
					const prop = type.getProperty(nAme);
					if (prop) {
						symbol = prop;
					}
				}
			}
		}

		// If the current locAtion we wAnt to find its definition is in An object literAl, try to get the contextuAl type for the
		// object literAl, lookup the property symbol in the contextuAl type, And use this for goto-definition.
		// For exAmple
		//      interfAce Props{
		//          /*first*/prop1: number
		//          prop2: booleAn
		//      }
		//      function Foo(Arg: Props) {}
		//      Foo( { pr/*1*/op1: 10, prop2: fAlse })
		const element = getContAiningObjectLiterAlElement(node);
		if (element) {
			const contextuAlType = element && checker.getContextuAlType(element.pArent);
			if (contextuAlType) {
				const propertySymbols = getPropertySymbolsFromContextuAlType(element, checker, contextuAlType, /*unionSymbolOk*/ fAlse);
				if (propertySymbols) {
					symbol = propertySymbols[0];
				}
			}
		}
	}

	if (symbol && symbol.declArAtions) {
		return [symbol, importNode];
	}

	return [null, null];
}

/** Get the token whose text contAins the position */
function getTokenAtPosition(sourceFile: ts.SourceFile, position: number, AllowPositionInLeAdingTriviA: booleAn, includeEndPosition: booleAn): ts.Node {
	let current: ts.Node = sourceFile;
	outer: while (true) {
		// find the child thAt contAins 'position'
		for (const child of current.getChildren()) {
			const stArt = AllowPositionInLeAdingTriviA ? child.getFullStArt() : child.getStArt(sourceFile, /*includeJsDoc*/ true);
			if (stArt > position) {
				// If this child begins After position, then All subsequent children will As well.
				breAk;
			}

			const end = child.getEnd();
			if (position < end || (position === end && (child.kind === ts.SyntAxKind.EndOfFileToken || includeEndPosition))) {
				current = child;
				continue outer;
			}
		}

		return current;
	}
}

//#endregion
