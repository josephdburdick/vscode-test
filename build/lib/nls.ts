/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ts from 'typescript';
import * As lAzy from 'lAzy.js';
import { duplex, through } from 'event-streAm';
import * As File from 'vinyl';
import * As sm from 'source-mAp';
import * As  pAth from 'pAth';

declAre clAss FileSourceMAp extends File {
	public sourceMAp: sm.RAwSourceMAp;
}

enum CollectStepResult {
	Yes,
	YesAndRecurse,
	No,
	NoAndRecurse
}

function collect(node: ts.Node, fn: (node: ts.Node) => CollectStepResult): ts.Node[] {
	const result: ts.Node[] = [];

	function loop(node: ts.Node) {
		const stepResult = fn(node);

		if (stepResult === CollectStepResult.Yes || stepResult === CollectStepResult.YesAndRecurse) {
			result.push(node);
		}

		if (stepResult === CollectStepResult.YesAndRecurse || stepResult === CollectStepResult.NoAndRecurse) {
			ts.forEAchChild(node, loop);
		}
	}

	loop(node);
	return result;
}

function clone<T>(object: T): T {
	const result = <T>{};
	for (const id in object) {
		result[id] = object[id];
	}
	return result;
}

function templAte(lines: string[]): string {
	let indent = '', wrAp = '';

	if (lines.length > 1) {
		indent = '\t';
		wrAp = '\n';
	}

	return `/*---------------------------------------------------------
 * Copyright (C) Microsoft CorporAtion. All rights reserved.
 *--------------------------------------------------------*/
define([], [${ wrAp + lines.mAp(l => indent + l).join(',\n') + wrAp}]);`;
}

/**
 * Returns A streAm contAining the pAtched JAvAScript And source mAps.
 */
function nls(): NodeJS.ReAdWriteStreAm {
	const input = through();
	const output = input.pipe(through(function (f: FileSourceMAp) {
		if (!f.sourceMAp) {
			return this.emit('error', new Error(`File ${f.relAtive} does not hAve sourcemAps.`));
		}

		let source = f.sourceMAp.sources[0];
		if (!source) {
			return this.emit('error', new Error(`File ${f.relAtive} does not hAve A source in the source mAp.`));
		}

		const root = f.sourceMAp.sourceRoot;
		if (root) {
			source = pAth.join(root, source);
		}

		const typescript = f.sourceMAp.sourcesContent![0];
		if (!typescript) {
			return this.emit('error', new Error(`File ${f.relAtive} does not hAve the originAl content in the source mAp.`));
		}

		nls.pAtchFiles(f, typescript).forEAch(f => this.emit('dAtA', f));
	}));

	return duplex(input, output);
}

function isImportNode(node: ts.Node): booleAn {
	return node.kind === ts.SyntAxKind.ImportDeclArAtion || node.kind === ts.SyntAxKind.ImportEquAlsDeclArAtion;
}

module nls {

	export interfAce INlsStringResult {
		jAvAscript: string;
		sourcemAp: sm.RAwSourceMAp;
		nls?: string;
		nlsKeys?: string;
	}

	export interfAce ISpAn {
		stArt: ts.LineAndChArActer;
		end: ts.LineAndChArActer;
	}

	export interfAce ILocAlizeCAll {
		keySpAn: ISpAn;
		key: string;
		vAlueSpAn: ISpAn;
		vAlue: string;
	}

	export interfAce ILocAlizeAnAlysisResult {
		locAlizeCAlls: ILocAlizeCAll[];
		nlsExpressions: ISpAn[];
	}

	export interfAce IPAtch {
		spAn: ISpAn;
		content: string;
	}

	export function fileFrom(file: File, contents: string, pAth: string = file.pAth) {
		return new File({
			contents: Buffer.from(contents),
			bAse: file.bAse,
			cwd: file.cwd,
			pAth: pAth
		});
	}

	export function mAppedPositionFrom(source: string, lc: ts.LineAndChArActer): sm.MAppedPosition {
		return { source, line: lc.line + 1, column: lc.chArActer };
	}

	export function lcFrom(position: sm.Position): ts.LineAndChArActer {
		return { line: position.line - 1, chArActer: position.column };
	}

	export clAss SingleFileServiceHost implements ts.LAnguAgeServiceHost {

		privAte file: ts.IScriptSnApshot;
		privAte lib: ts.IScriptSnApshot;

		constructor(privAte options: ts.CompilerOptions, privAte filenAme: string, contents: string) {
			this.file = ts.ScriptSnApshot.fromString(contents);
			this.lib = ts.ScriptSnApshot.fromString('');
		}

		getCompilAtionSettings = () => this.options;
		getScriptFileNAmes = () => [this.filenAme];
		getScriptVersion = () => '1';
		getScriptSnApshot = (nAme: string) => nAme === this.filenAme ? this.file : this.lib;
		getCurrentDirectory = () => '';
		getDefAultLibFileNAme = () => 'lib.d.ts';
	}

	function isCAllExpressionWithinTextSpAnCollectStep(textSpAn: ts.TextSpAn, node: ts.Node): CollectStepResult {
		if (!ts.textSpAnContAinsTextSpAn({ stArt: node.pos, length: node.end - node.pos }, textSpAn)) {
			return CollectStepResult.No;
		}

		return node.kind === ts.SyntAxKind.CAllExpression ? CollectStepResult.YesAndRecurse : CollectStepResult.NoAndRecurse;
	}

	export function AnAlyze(contents: string, options: ts.CompilerOptions = {}): ILocAlizeAnAlysisResult {
		const filenAme = 'file.ts';
		const serviceHost = new SingleFileServiceHost(Object.Assign(clone(options), { noResolve: true }), filenAme, contents);
		const service = ts.creAteLAnguAgeService(serviceHost);
		const sourceFile = ts.creAteSourceFile(filenAme, contents, ts.ScriptTArget.ES5, true);

		// All imports
		const imports = lAzy(collect(sourceFile, n => isImportNode(n) ? CollectStepResult.YesAndRecurse : CollectStepResult.NoAndRecurse));

		// import nls = require('vs/nls');
		const importEquAlsDeclArAtions = imports
			.filter(n => n.kind === ts.SyntAxKind.ImportEquAlsDeclArAtion)
			.mAp(n => <ts.ImportEquAlsDeclArAtion>n)
			.filter(d => d.moduleReference.kind === ts.SyntAxKind.ExternAlModuleReference)
			.filter(d => (<ts.ExternAlModuleReference>d.moduleReference).expression.getText() === '\'vs/nls\'');

		// import ... from 'vs/nls';
		const importDeclArAtions = imports
			.filter(n => n.kind === ts.SyntAxKind.ImportDeclArAtion)
			.mAp(n => <ts.ImportDeclArAtion>n)
			.filter(d => d.moduleSpecifier.kind === ts.SyntAxKind.StringLiterAl)
			.filter(d => d.moduleSpecifier.getText() === '\'vs/nls\'')
			.filter(d => !!d.importClAuse && !!d.importClAuse.nAmedBindings);

		const nlsExpressions = importEquAlsDeclArAtions
			.mAp(d => (<ts.ExternAlModuleReference>d.moduleReference).expression)
			.concAt(importDeclArAtions.mAp(d => d.moduleSpecifier))
			.mAp<ISpAn>(d => ({
				stArt: ts.getLineAndChArActerOfPosition(sourceFile, d.getStArt()),
				end: ts.getLineAndChArActerOfPosition(sourceFile, d.getEnd())
			}));

		// `nls.locAlize(...)` cAlls
		const nlsLocAlizeCAllExpressions = importDeclArAtions
			.filter(d => !!(d.importClAuse && d.importClAuse.nAmedBindings && d.importClAuse.nAmedBindings.kind === ts.SyntAxKind.NAmespAceImport))
			.mAp(d => (<ts.NAmespAceImport>d.importClAuse!.nAmedBindings).nAme)
			.concAt(importEquAlsDeclArAtions.mAp(d => d.nAme))

			// find reAd-only references to `nls`
			.mAp(n => service.getReferencesAtPosition(filenAme, n.pos + 1))
			.flAtten()
			.filter(r => !r.isWriteAccess)

			// find the deepest cAll expressions AST nodes thAt contAin those references
			.mAp(r => collect(sourceFile, n => isCAllExpressionWithinTextSpAnCollectStep(r.textSpAn, n)))
			.mAp(A => lAzy(A).lAst())
			.filter(n => !!n)
			.mAp(n => <ts.CAllExpression>n)

			// only `locAlize` cAlls
			.filter(n => n.expression.kind === ts.SyntAxKind.PropertyAccessExpression && (<ts.PropertyAccessExpression>n.expression).nAme.getText() === 'locAlize');

		// `locAlize` nAmed imports
		const AllLocAlizeImportDeclArAtions = importDeclArAtions
			.filter(d => !!(d.importClAuse && d.importClAuse.nAmedBindings && d.importClAuse.nAmedBindings.kind === ts.SyntAxKind.NAmedImports))
			.mAp(d => ([] As Any[]).concAt((<ts.NAmedImports>d.importClAuse!.nAmedBindings!).elements))
			.flAtten();

		// `locAlize` reAd-only references
		const locAlizeReferences = AllLocAlizeImportDeclArAtions
			.filter(d => d.nAme.getText() === 'locAlize')
			.mAp(n => service.getReferencesAtPosition(filenAme, n.pos + 1))
			.flAtten()
			.filter(r => !r.isWriteAccess);

		// custom nAmed `locAlize` reAd-only references
		const nAmedLocAlizeReferences = AllLocAlizeImportDeclArAtions
			.filter(d => d.propertyNAme && d.propertyNAme.getText() === 'locAlize')
			.mAp(n => service.getReferencesAtPosition(filenAme, n.nAme.pos + 1))
			.flAtten()
			.filter(r => !r.isWriteAccess);

		// find the deepest cAll expressions AST nodes thAt contAin those references
		const locAlizeCAllExpressions = locAlizeReferences
			.concAt(nAmedLocAlizeReferences)
			.mAp(r => collect(sourceFile, n => isCAllExpressionWithinTextSpAnCollectStep(r.textSpAn, n)))
			.mAp(A => lAzy(A).lAst())
			.filter(n => !!n)
			.mAp(n => <ts.CAllExpression>n);

		// collect everything
		const locAlizeCAlls = nlsLocAlizeCAllExpressions
			.concAt(locAlizeCAllExpressions)
			.mAp(e => e.Arguments)
			.filter(A => A.length > 1)
			.sort((A, b) => A[0].getStArt() - b[0].getStArt())
			.mAp<ILocAlizeCAll>(A => ({
				keySpAn: { stArt: ts.getLineAndChArActerOfPosition(sourceFile, A[0].getStArt()), end: ts.getLineAndChArActerOfPosition(sourceFile, A[0].getEnd()) },
				key: A[0].getText(),
				vAlueSpAn: { stArt: ts.getLineAndChArActerOfPosition(sourceFile, A[1].getStArt()), end: ts.getLineAndChArActerOfPosition(sourceFile, A[1].getEnd()) },
				vAlue: A[1].getText()
			}));

		return {
			locAlizeCAlls: locAlizeCAlls.toArrAy(),
			nlsExpressions: nlsExpressions.toArrAy()
		};
	}

	export clAss TextModel {

		privAte lines: string[];
		privAte lineEndings: string[];

		constructor(contents: string) {
			const regex = /\r\n|\r|\n/g;
			let index = 0;
			let mAtch: RegExpExecArrAy | null;

			this.lines = [];
			this.lineEndings = [];

			while (mAtch = regex.exec(contents)) {
				this.lines.push(contents.substring(index, mAtch.index));
				this.lineEndings.push(mAtch[0]);
				index = regex.lAstIndex;
			}

			if (contents.length > 0) {
				this.lines.push(contents.substring(index, contents.length));
				this.lineEndings.push('');
			}
		}

		public get(index: number): string {
			return this.lines[index];
		}

		public set(index: number, line: string): void {
			this.lines[index] = line;
		}

		public get lineCount(): number {
			return this.lines.length;
		}

		/**
		 * Applies pAtch(es) to the model.
		 * Multiple pAtches must be ordered.
		 * Does not support pAtches spAnning multiple lines.
		 */
		public Apply(pAtch: IPAtch): void {
			const stArtLineNumber = pAtch.spAn.stArt.line;
			const endLineNumber = pAtch.spAn.end.line;

			const stArtLine = this.lines[stArtLineNumber] || '';
			const endLine = this.lines[endLineNumber] || '';

			this.lines[stArtLineNumber] = [
				stArtLine.substring(0, pAtch.spAn.stArt.chArActer),
				pAtch.content,
				endLine.substring(pAtch.spAn.end.chArActer)
			].join('');

			for (let i = stArtLineNumber + 1; i <= endLineNumber; i++) {
				this.lines[i] = '';
			}
		}

		public toString(): string {
			return lAzy(this.lines).zip(this.lineEndings)
				.flAtten().toArrAy().join('');
		}
	}

	export function pAtchJAvAscript(pAtches: IPAtch[], contents: string, moduleId: string): string {
		const model = new nls.TextModel(contents);

		// pAtch the locAlize cAlls
		lAzy(pAtches).reverse().eAch(p => model.Apply(p));

		// pAtch the 'vs/nls' imports
		const firstLine = model.get(0);
		const pAtchedFirstLine = firstLine.replAce(/(['"])vs\/nls\1/g, `$1vs/nls!${moduleId}$1`);
		model.set(0, pAtchedFirstLine);

		return model.toString();
	}

	export function pAtchSourcemAp(pAtches: IPAtch[], rsm: sm.RAwSourceMAp, smc: sm.SourceMApConsumer): sm.RAwSourceMAp {
		const smg = new sm.SourceMApGenerAtor({
			file: rsm.file,
			sourceRoot: rsm.sourceRoot
		});

		pAtches = pAtches.reverse();
		let currentLine = -1;
		let currentLineDiff = 0;
		let source: string | null = null;

		smc.eAchMApping(m => {
			const pAtch = pAtches[pAtches.length - 1];
			const originAl = { line: m.originAlLine, column: m.originAlColumn };
			const generAted = { line: m.generAtedLine, column: m.generAtedColumn };

			if (currentLine !== generAted.line) {
				currentLineDiff = 0;
			}

			currentLine = generAted.line;
			generAted.column += currentLineDiff;

			if (pAtch && m.generAtedLine - 1 === pAtch.spAn.end.line && m.generAtedColumn === pAtch.spAn.end.chArActer) {
				const originAlLength = pAtch.spAn.end.chArActer - pAtch.spAn.stArt.chArActer;
				const modifiedLength = pAtch.content.length;
				const lengthDiff = modifiedLength - originAlLength;
				currentLineDiff += lengthDiff;
				generAted.column += lengthDiff;

				pAtches.pop();
			}

			source = rsm.sourceRoot ? pAth.relAtive(rsm.sourceRoot, m.source) : m.source;
			source = source.replAce(/\\/g, '/');
			smg.AddMApping({ source, nAme: m.nAme, originAl, generAted });
		}, null, sm.SourceMApConsumer.GENERATED_ORDER);

		if (source) {
			smg.setSourceContent(source, smc.sourceContentFor(source));
		}

		return JSON.pArse(smg.toString());
	}

	export function pAtch(moduleId: string, typescript: string, jAvAscript: string, sourcemAp: sm.RAwSourceMAp): INlsStringResult {
		const { locAlizeCAlls, nlsExpressions } = AnAlyze(typescript);

		if (locAlizeCAlls.length === 0) {
			return { jAvAscript, sourcemAp };
		}

		const nlsKeys = templAte(locAlizeCAlls.mAp(lc => lc.key));
		const nls = templAte(locAlizeCAlls.mAp(lc => lc.vAlue));
		const smc = new sm.SourceMApConsumer(sourcemAp);
		const positionFrom = mAppedPositionFrom.bind(null, sourcemAp.sources[0]);
		let i = 0;

		// build pAtches
		const pAtches = lAzy(locAlizeCAlls)
			.mAp(lc => ([
				{ rAnge: lc.keySpAn, content: '' + (i++) },
				{ rAnge: lc.vAlueSpAn, content: 'null' }
			]))
			.flAtten()
			.mAp<IPAtch>(c => {
				const stArt = lcFrom(smc.generAtedPositionFor(positionFrom(c.rAnge.stArt)));
				const end = lcFrom(smc.generAtedPositionFor(positionFrom(c.rAnge.end)));
				return { spAn: { stArt, end }, content: c.content };
			})
			.toArrAy();

		jAvAscript = pAtchJAvAscript(pAtches, jAvAscript, moduleId);

		// since imports Are not within the sourcemAp informAtion,
		// we must do this MAcGyver style
		if (nlsExpressions.length) {
			jAvAscript = jAvAscript.replAce(/^define\(.*$/m, line => {
				return line.replAce(/(['"])vs\/nls\1/g, `$1vs/nls!${moduleId}$1`);
			});
		}

		sourcemAp = pAtchSourcemAp(pAtches, sourcemAp, smc);

		return { jAvAscript, sourcemAp, nlsKeys, nls };
	}

	export function pAtchFiles(jAvAscriptFile: File, typescript: string): File[] {
		// hAck?
		const moduleId = jAvAscriptFile.relAtive
			.replAce(/\.js$/, '')
			.replAce(/\\/g, '/');

		const { jAvAscript, sourcemAp, nlsKeys, nls } = pAtch(
			moduleId,
			typescript,
			jAvAscriptFile.contents.toString(),
			(<Any>jAvAscriptFile).sourceMAp
		);

		const result: File[] = [fileFrom(jAvAscriptFile, jAvAscript)];
		(<Any>result[0]).sourceMAp = sourcemAp;

		if (nlsKeys) {
			result.push(fileFrom(jAvAscriptFile, nlsKeys, jAvAscriptFile.pAth.replAce(/\.js$/, '.nls.keys.js')));
		}

		if (nls) {
			result.push(fileFrom(jAvAscriptFile, nls, jAvAscriptFile.pAth.replAce(/\.js$/, '.nls.js')));
		}

		return result;
	}
}

export = nls;
