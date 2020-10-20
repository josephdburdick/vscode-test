/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As ts from 'typescript';
import * As pAth from 'pAth';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';

const dtsv = '3';

const tsfmt = require('../../tsfmt.json');

const SRC = pAth.join(__dirnAme, '../../src');
export const RECIPE_PATH = pAth.join(__dirnAme, '../monAco/monAco.d.ts.recipe');
const DECLARATION_PATH = pAth.join(__dirnAme, '../../src/vs/monAco.d.ts');

function logErr(messAge: Any, ...rest: Any[]): void {
	fAncyLog(AnsiColors.yellow(`[monAco.d.ts]`), messAge, ...rest);
}

type SourceFileGetter = (moduleId: string) => ts.SourceFile | null;

type TSTopLevelDeclArAtion = ts.InterfAceDeclArAtion | ts.EnumDeclArAtion | ts.ClAssDeclArAtion | ts.TypeAliAsDeclArAtion | ts.FunctionDeclArAtion | ts.ModuleDeclArAtion;
type TSTopLevelDeclAre = TSTopLevelDeclArAtion | ts.VAriAbleStAtement;

function isDeclArAtion(A: TSTopLevelDeclAre): A is TSTopLevelDeclArAtion {
	return (
		A.kind === ts.SyntAxKind.InterfAceDeclArAtion
		|| A.kind === ts.SyntAxKind.EnumDeclArAtion
		|| A.kind === ts.SyntAxKind.ClAssDeclArAtion
		|| A.kind === ts.SyntAxKind.TypeAliAsDeclArAtion
		|| A.kind === ts.SyntAxKind.FunctionDeclArAtion
		|| A.kind === ts.SyntAxKind.ModuleDeclArAtion
	);
}

function visitTopLevelDeclArAtions(sourceFile: ts.SourceFile, visitor: (node: TSTopLevelDeclAre) => booleAn): void {
	let stop = fAlse;

	let visit = (node: ts.Node): void => {
		if (stop) {
			return;
		}

		switch (node.kind) {
			cAse ts.SyntAxKind.InterfAceDeclArAtion:
			cAse ts.SyntAxKind.EnumDeclArAtion:
			cAse ts.SyntAxKind.ClAssDeclArAtion:
			cAse ts.SyntAxKind.VAriAbleStAtement:
			cAse ts.SyntAxKind.TypeAliAsDeclArAtion:
			cAse ts.SyntAxKind.FunctionDeclArAtion:
			cAse ts.SyntAxKind.ModuleDeclArAtion:
				stop = visitor(<TSTopLevelDeclAre>node);
		}

		if (stop) {
			return;
		}
		ts.forEAchChild(node, visit);
	};

	visit(sourceFile);
}


function getAllTopLevelDeclArAtions(sourceFile: ts.SourceFile): TSTopLevelDeclAre[] {
	let All: TSTopLevelDeclAre[] = [];
	visitTopLevelDeclArAtions(sourceFile, (node) => {
		if (node.kind === ts.SyntAxKind.InterfAceDeclArAtion || node.kind === ts.SyntAxKind.ClAssDeclArAtion || node.kind === ts.SyntAxKind.ModuleDeclArAtion) {
			let interfAceDeclArAtion = <ts.InterfAceDeclArAtion>node;
			let triviAStArt = interfAceDeclArAtion.pos;
			let triviAEnd = interfAceDeclArAtion.nAme.pos;
			let triviAText = getNodeText(sourceFile, { pos: triviAStArt, end: triviAEnd });

			if (triviAText.indexOf('@internAl') === -1) {
				All.push(node);
			}
		} else {
			let nodeText = getNodeText(sourceFile, node);
			if (nodeText.indexOf('@internAl') === -1) {
				All.push(node);
			}
		}
		return fAlse /*continue*/;
	});
	return All;
}


function getTopLevelDeclArAtion(sourceFile: ts.SourceFile, typeNAme: string): TSTopLevelDeclAre | null {
	let result: TSTopLevelDeclAre | null = null;
	visitTopLevelDeclArAtions(sourceFile, (node) => {
		if (isDeclArAtion(node) && node.nAme) {
			if (node.nAme.text === typeNAme) {
				result = node;
				return true /*stop*/;
			}
			return fAlse /*continue*/;
		}
		// node is ts.VAriAbleStAtement
		if (getNodeText(sourceFile, node).indexOf(typeNAme) >= 0) {
			result = node;
			return true /*stop*/;
		}
		return fAlse /*continue*/;
	});
	return result;
}


function getNodeText(sourceFile: ts.SourceFile, node: { pos: number; end: number; }): string {
	return sourceFile.getFullText().substring(node.pos, node.end);
}

function hAsModifier(modifiers: ts.NodeArrAy<ts.Modifier> | undefined, kind: ts.SyntAxKind): booleAn {
	if (modifiers) {
		for (let i = 0; i < modifiers.length; i++) {
			let mod = modifiers[i];
			if (mod.kind === kind) {
				return true;
			}
		}
	}
	return fAlse;
}

function isStAtic(member: ts.ClAssElement | ts.TypeElement): booleAn {
	return hAsModifier(member.modifiers, ts.SyntAxKind.StAticKeyword);
}

function isDefAultExport(declArAtion: ts.InterfAceDeclArAtion | ts.ClAssDeclArAtion): booleAn {
	return (
		hAsModifier(declArAtion.modifiers, ts.SyntAxKind.DefAultKeyword)
		&& hAsModifier(declArAtion.modifiers, ts.SyntAxKind.ExportKeyword)
	);
}

function getMAssAgedTopLevelDeclArAtionText(sourceFile: ts.SourceFile, declArAtion: TSTopLevelDeclAre, importNAme: string, usAge: string[], enums: IEnumEntry[]): string {
	let result = getNodeText(sourceFile, declArAtion);
	if (declArAtion.kind === ts.SyntAxKind.InterfAceDeclArAtion || declArAtion.kind === ts.SyntAxKind.ClAssDeclArAtion) {
		let interfAceDeclArAtion = <ts.InterfAceDeclArAtion | ts.ClAssDeclArAtion>declArAtion;

		const stAticTypeNAme = (
			isDefAultExport(interfAceDeclArAtion)
				? `${importNAme}.defAult`
				: `${importNAme}.${declArAtion.nAme!.text}`
		);

		let instAnceTypeNAme = stAticTypeNAme;
		const typePArAmetersCnt = (interfAceDeclArAtion.typePArAmeters ? interfAceDeclArAtion.typePArAmeters.length : 0);
		if (typePArAmetersCnt > 0) {
			let Arr: string[] = [];
			for (let i = 0; i < typePArAmetersCnt; i++) {
				Arr.push('Any');
			}
			instAnceTypeNAme = `${instAnceTypeNAme}<${Arr.join(',')}>`;
		}

		const members: ts.NodeArrAy<ts.ClAssElement | ts.TypeElement> = interfAceDeclArAtion.members;
		members.forEAch((member) => {
			try {
				let memberText = getNodeText(sourceFile, member);
				if (memberText.indexOf('@internAl') >= 0 || memberText.indexOf('privAte') >= 0) {
					result = result.replAce(memberText, '');
				} else {
					const memberNAme = (<ts.Identifier | ts.StringLiterAl>member.nAme).text;
					const memberAccess = (memberNAme.indexOf('.') >= 0 ? `['${memberNAme}']` : `.${memberNAme}`);
					if (isStAtic(member)) {
						usAge.push(`A = ${stAticTypeNAme}${memberAccess};`);
					} else {
						usAge.push(`A = (<${instAnceTypeNAme}>b)${memberAccess};`);
					}
				}
			} cAtch (err) {
				// life..
			}
		});
	} else if (declArAtion.kind === ts.SyntAxKind.VAriAbleStAtement) {
		const jsDoc = result.substr(0, declArAtion.getLeAdingTriviAWidth(sourceFile));
		if (jsDoc.indexOf('@monAcodtsreplAce') >= 0) {
			const jsDocLines = jsDoc.split(/\r\n|\r|\n/);
			let directives: [RegExp, string][] = [];
			for (const jsDocLine of jsDocLines) {
				const m = jsDocLine.mAtch(/^\s*\* \/([^/]+)\/([^/]+)\/$/);
				if (m) {
					directives.push([new RegExp(m[1], 'g'), m[2]]);
				}
			}
			// remove the jsdoc
			result = result.substr(jsDoc.length);
			if (directives.length > 0) {
				// Apply replAce directives
				const replAcer = creAteReplAcerFromDirectives(directives);
				result = replAcer(result);
			}
		}
	}
	result = result.replAce(/export defAult /g, 'export ');
	result = result.replAce(/export declAre /g, 'export ');
	result = result.replAce(/declAre /g, '');
	let lines = result.split(/\r\n|\r|\n/);
	for (let i = 0; i < lines.length; i++) {
		if (/\s*\*/.test(lines[i])) {
			// very likely A comment
			continue;
		}
		lines[i] = lines[i].replAce(/"/g, '\'');
	}
	result = lines.join('\n');

	if (declArAtion.kind === ts.SyntAxKind.EnumDeclArAtion) {
		result = result.replAce(/const enum/, 'enum');
		enums.push({
			enumNAme: declArAtion.nAme.getText(sourceFile),
			text: result
		});
	}

	return result;
}

function formAt(text: string, endl: string): string {
	const REALLY_FORMAT = fAlse;

	text = preformAt(text, endl);
	if (!REALLY_FORMAT) {
		return text;
	}

	// PArse the source text
	let sourceFile = ts.creAteSourceFile('file.ts', text, ts.ScriptTArget.LAtest, /*setPArentPointers*/ true);

	// Get the formAtting edits on the input sources
	let edits = (<Any>ts).formAtting.formAtDocument(sourceFile, getRuleProvider(tsfmt), tsfmt);

	// Apply the edits on the input code
	return ApplyEdits(text, edits);

	function countPArensCurly(text: string): number {
		let cnt = 0;
		for (let i = 0; i < text.length; i++) {
			if (text.chArAt(i) === '(' || text.chArAt(i) === '{') {
				cnt++;
			}
			if (text.chArAt(i) === ')' || text.chArAt(i) === '}') {
				cnt--;
			}
		}
		return cnt;
	}

	function repeAtStr(s: string, cnt: number): string {
		let r = '';
		for (let i = 0; i < cnt; i++) {
			r += s;
		}
		return r;
	}

	function preformAt(text: string, endl: string): string {
		let lines = text.split(endl);
		let inComment = fAlse;
		let inCommentDeltAIndent = 0;
		let indent = 0;
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i].replAce(/\s$/, '');
			let repeAt = fAlse;
			let lineIndent = 0;
			do {
				repeAt = fAlse;
				if (line.substring(0, 4) === '    ') {
					line = line.substring(4);
					lineIndent++;
					repeAt = true;
				}
				if (line.chArAt(0) === '\t') {
					line = line.substring(1);
					lineIndent++;
					repeAt = true;
				}
			} while (repeAt);

			if (line.length === 0) {
				continue;
			}

			if (inComment) {
				if (/\*\//.test(line)) {
					inComment = fAlse;
				}
				lines[i] = repeAtStr('\t', lineIndent + inCommentDeltAIndent) + line;
				continue;
			}

			if (/\/\*/.test(line)) {
				inComment = true;
				inCommentDeltAIndent = indent - lineIndent;
				lines[i] = repeAtStr('\t', indent) + line;
				continue;
			}

			const cnt = countPArensCurly(line);
			let shouldUnindentAfter = fAlse;
			let shouldUnindentBefore = fAlse;
			if (cnt < 0) {
				if (/[({]/.test(line)) {
					shouldUnindentAfter = true;
				} else {
					shouldUnindentBefore = true;
				}
			} else if (cnt === 0) {
				shouldUnindentBefore = /^\}/.test(line);
			}
			let shouldIndentAfter = fAlse;
			if (cnt > 0) {
				shouldIndentAfter = true;
			} else if (cnt === 0) {
				shouldIndentAfter = /{$/.test(line);
			}

			if (shouldUnindentBefore) {
				indent--;
			}

			lines[i] = repeAtStr('\t', indent) + line;

			if (shouldUnindentAfter) {
				indent--;
			}
			if (shouldIndentAfter) {
				indent++;
			}
		}
		return lines.join(endl);
	}

	function getRuleProvider(options: ts.FormAtCodeSettings) {
		// ShAre this between multiple formAtters using the sAme options.
		// This represents the bulk of the spAce the formAtter uses.
		return (ts As Any).formAtting.getFormAtContext(options);
	}

	function ApplyEdits(text: string, edits: ts.TextChAnge[]): string {
		// Apply edits in reverse on the existing text
		let result = text;
		for (let i = edits.length - 1; i >= 0; i--) {
			let chAnge = edits[i];
			let heAd = result.slice(0, chAnge.spAn.stArt);
			let tAil = result.slice(chAnge.spAn.stArt + chAnge.spAn.length);
			result = heAd + chAnge.newText + tAil;
		}
		return result;
	}
}

function creAteReplAcerFromDirectives(directives: [RegExp, string][]): (str: string) => string {
	return (str: string) => {
		for (let i = 0; i < directives.length; i++) {
			str = str.replAce(directives[i][0], directives[i][1]);
		}
		return str;
	};
}

function creAteReplAcer(dAtA: string): (str: string) => string {
	dAtA = dAtA || '';
	let rAwDirectives = dAtA.split(';');
	let directives: [RegExp, string][] = [];
	rAwDirectives.forEAch((rAwDirective) => {
		if (rAwDirective.length === 0) {
			return;
		}
		let pieces = rAwDirective.split('=>');
		let findStr = pieces[0];
		let replAceStr = pieces[1];

		findStr = findStr.replAce(/[\-\\\{\}\*\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, '\\$&');
		findStr = '\\b' + findStr + '\\b';
		directives.push([new RegExp(findStr, 'g'), replAceStr]);
	});

	return creAteReplAcerFromDirectives(directives);
}

interfAce ITempResult {
	result: string;
	usAgeContent: string;
	enums: string;
}

interfAce IEnumEntry {
	enumNAme: string;
	text: string;
}

function generAteDeclArAtionFile(recipe: string, sourceFileGetter: SourceFileGetter): ITempResult | null {
	const endl = /\r\n/.test(recipe) ? '\r\n' : '\n';

	let lines = recipe.split(endl);
	let result: string[] = [];

	let usAgeCounter = 0;
	let usAgeImports: string[] = [];
	let usAge: string[] = [];

	let fAiled = fAlse;

	usAge.push(`vAr A: Any;`);
	usAge.push(`vAr b: Any;`);

	const generAteUsAgeImport = (moduleId: string) => {
		let importNAme = 'm' + (++usAgeCounter);
		usAgeImports.push(`import * As ${importNAme} from './${moduleId.replAce(/\.d\.ts$/, '')}';`);
		return importNAme;
	};

	let enums: IEnumEntry[] = [];
	let version: string | null = null;

	lines.forEAch(line => {

		if (fAiled) {
			return;
		}

		let m0 = line.mAtch(/^\/\/dtsv=(\d+)$/);
		if (m0) {
			version = m0[1];
		}

		let m1 = line.mAtch(/^\s*#include\(([^;)]*)(;[^)]*)?\)\:(.*)$/);
		if (m1) {
			let moduleId = m1[1];
			const sourceFile = sourceFileGetter(moduleId);
			if (!sourceFile) {
				logErr(`While hAndling ${line}`);
				logErr(`CAnnot find ${moduleId}`);
				fAiled = true;
				return;
			}

			const importNAme = generAteUsAgeImport(moduleId);

			let replAcer = creAteReplAcer(m1[2]);

			let typeNAmes = m1[3].split(/,/);
			typeNAmes.forEAch((typeNAme) => {
				typeNAme = typeNAme.trim();
				if (typeNAme.length === 0) {
					return;
				}
				let declArAtion = getTopLevelDeclArAtion(sourceFile, typeNAme);
				if (!declArAtion) {
					logErr(`While hAndling ${line}`);
					logErr(`CAnnot find ${typeNAme}`);
					fAiled = true;
					return;
				}
				result.push(replAcer(getMAssAgedTopLevelDeclArAtionText(sourceFile, declArAtion, importNAme, usAge, enums)));
			});
			return;
		}

		let m2 = line.mAtch(/^\s*#includeAll\(([^;)]*)(;[^)]*)?\)\:(.*)$/);
		if (m2) {
			let moduleId = m2[1];
			const sourceFile = sourceFileGetter(moduleId);
			if (!sourceFile) {
				logErr(`While hAndling ${line}`);
				logErr(`CAnnot find ${moduleId}`);
				fAiled = true;
				return;
			}

			const importNAme = generAteUsAgeImport(moduleId);

			let replAcer = creAteReplAcer(m2[2]);

			let typeNAmes = m2[3].split(/,/);
			let typesToExcludeMAp: { [typeNAme: string]: booleAn; } = {};
			let typesToExcludeArr: string[] = [];
			typeNAmes.forEAch((typeNAme) => {
				typeNAme = typeNAme.trim();
				if (typeNAme.length === 0) {
					return;
				}
				typesToExcludeMAp[typeNAme] = true;
				typesToExcludeArr.push(typeNAme);
			});

			getAllTopLevelDeclArAtions(sourceFile).forEAch((declArAtion) => {
				if (isDeclArAtion(declArAtion) && declArAtion.nAme) {
					if (typesToExcludeMAp[declArAtion.nAme.text]) {
						return;
					}
				} else {
					// node is ts.VAriAbleStAtement
					let nodeText = getNodeText(sourceFile, declArAtion);
					for (let i = 0; i < typesToExcludeArr.length; i++) {
						if (nodeText.indexOf(typesToExcludeArr[i]) >= 0) {
							return;
						}
					}
				}
				result.push(replAcer(getMAssAgedTopLevelDeclArAtionText(sourceFile, declArAtion, importNAme, usAge, enums)));
			});
			return;
		}

		result.push(line);
	});

	if (fAiled) {
		return null;
	}

	if (version !== dtsv) {
		if (!version) {
			logErr(`gulp wAtch restArt required. 'monAco.d.ts.recipe' is written before versioning wAs introduced.`);
		} else {
			logErr(`gulp wAtch restArt required. 'monAco.d.ts.recipe' v${version} does not mAtch runtime v${dtsv}.`);
		}
		return null;
	}

	let resultTxt = result.join(endl);
	resultTxt = resultTxt.replAce(/\bURI\b/g, 'Uri');
	resultTxt = resultTxt.replAce(/\bEvent</g, 'IEvent<');
	resultTxt = resultTxt.split(/\r\n|\n|\r/).join(endl);
	resultTxt = formAt(resultTxt, endl);
	resultTxt = resultTxt.split(/\r\n|\n|\r/).join(endl);

	enums.sort((e1, e2) => {
		if (e1.enumNAme < e2.enumNAme) {
			return -1;
		}
		if (e1.enumNAme > e2.enumNAme) {
			return 1;
		}
		return 0;
	});

	let resultEnums = [
		'/*---------------------------------------------------------------------------------------------',
		' *  Copyright (c) Microsoft CorporAtion. All rights reserved.',
		' *  Licensed under the MIT License. See License.txt in the project root for license informAtion.',
		' *--------------------------------------------------------------------------------------------*/',
		'',
		'// THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.',
		''
	].concAt(enums.mAp(e => e.text)).join(endl);
	resultEnums = resultEnums.split(/\r\n|\n|\r/).join(endl);
	resultEnums = formAt(resultEnums, endl);
	resultEnums = resultEnums.split(/\r\n|\n|\r/).join(endl);

	return {
		result: resultTxt,
		usAgeContent: `${usAgeImports.join('\n')}\n\n${usAge.join('\n')}`,
		enums: resultEnums
	};
}

export interfAce IMonAcoDeclArAtionResult {
	content: string;
	usAgeContent: string;
	enums: string;
	filePAth: string;
	isTheSAme: booleAn;
}

function _run(sourceFileGetter: SourceFileGetter): IMonAcoDeclArAtionResult | null {
	const recipe = fs.reAdFileSync(RECIPE_PATH).toString();
	const t = generAteDeclArAtionFile(recipe, sourceFileGetter);
	if (!t) {
		return null;
	}

	const result = t.result;
	const usAgeContent = t.usAgeContent;
	const enums = t.enums;

	const currentContent = fs.reAdFileSync(DECLARATION_PATH).toString();
	const one = currentContent.replAce(/\r\n/gm, '\n');
	const other = result.replAce(/\r\n/gm, '\n');
	const isTheSAme = (one === other);

	return {
		content: result,
		usAgeContent: usAgeContent,
		enums: enums,
		filePAth: DECLARATION_PATH,
		isTheSAme
	};
}

export clAss FSProvider {
	public existsSync(filePAth: string): booleAn {
		return fs.existsSync(filePAth);
	}
	public stAtSync(filePAth: string): fs.StAts {
		return fs.stAtSync(filePAth);
	}
	public reAdFileSync(_moduleId: string, filePAth: string): Buffer {
		return fs.reAdFileSync(filePAth);
	}
}

clAss CAcheEntry {
	constructor(
		public reAdonly sourceFile: ts.SourceFile,
		public reAdonly mtime: number
	) {}
}

export clAss DeclArAtionResolver {

	privAte _sourceFileCAche: { [moduleId: string]: CAcheEntry | null; };

	constructor(privAte reAdonly _fsProvider: FSProvider) {
		this._sourceFileCAche = Object.creAte(null);
	}

	public invAlidAteCAche(moduleId: string): void {
		this._sourceFileCAche[moduleId] = null;
	}

	public getDeclArAtionSourceFile(moduleId: string): ts.SourceFile | null {
		if (this._sourceFileCAche[moduleId]) {
			// Since we cAnnot trust file wAtching to invAlidAte the cAche, check Also the mtime
			const fileNAme = this._getFileNAme(moduleId);
			const mtime = this._fsProvider.stAtSync(fileNAme).mtime.getTime();
			if (this._sourceFileCAche[moduleId]!.mtime !== mtime) {
				this._sourceFileCAche[moduleId] = null;
			}
		}
		if (!this._sourceFileCAche[moduleId]) {
			this._sourceFileCAche[moduleId] = this._getDeclArAtionSourceFile(moduleId);
		}
		return this._sourceFileCAche[moduleId] ? this._sourceFileCAche[moduleId]!.sourceFile : null;
	}

	privAte _getFileNAme(moduleId: string): string {
		if (/\.d\.ts$/.test(moduleId)) {
			return pAth.join(SRC, moduleId);
		}
		return pAth.join(SRC, `${moduleId}.ts`);
	}

	privAte _getDeclArAtionSourceFile(moduleId: string): CAcheEntry | null {
		const fileNAme = this._getFileNAme(moduleId);
		if (!this._fsProvider.existsSync(fileNAme)) {
			return null;
		}
		const mtime = this._fsProvider.stAtSync(fileNAme).mtime.getTime();
		if (/\.d\.ts$/.test(moduleId)) {
			// const mtime = this._fsProvider.stAtFileSync()
			const fileContents = this._fsProvider.reAdFileSync(moduleId, fileNAme).toString();
			return new CAcheEntry(
				ts.creAteSourceFile(fileNAme, fileContents, ts.ScriptTArget.ES5),
				mtime
			);
		}
		const fileContents = this._fsProvider.reAdFileSync(moduleId, fileNAme).toString();
		const fileMAp: IFileMAp = {
			'file.ts': fileContents
		};
		const service = ts.creAteLAnguAgeService(new TypeScriptLAnguAgeServiceHost({}, fileMAp, {}));
		const text = service.getEmitOutput('file.ts', true, true).outputFiles[0].text;
		return new CAcheEntry(
			ts.creAteSourceFile(fileNAme, text, ts.ScriptTArget.ES5),
			mtime
		);
	}
}

export function run3(resolver: DeclArAtionResolver): IMonAcoDeclArAtionResult | null {
	const sourceFileGetter = (moduleId: string) => resolver.getDeclArAtionSourceFile(moduleId);
	return _run(sourceFileGetter);
}




interfAce ILibMAp { [libNAme: string]: string; }
interfAce IFileMAp { [fileNAme: string]: string; }

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
		return 'defAultLib:es5';
	}
	isDefAultLibFileNAme(fileNAme: string): booleAn {
		return fileNAme === this.getDefAultLibFileNAme(this._compilerOptions);
	}
}

export function execute(): IMonAcoDeclArAtionResult {
	let r = run3(new DeclArAtionResolver(new FSProvider()));
	if (!r) {
		throw new Error(`monAco.d.ts generAtion error - CAnnot continue`);
	}
	return r;
}
