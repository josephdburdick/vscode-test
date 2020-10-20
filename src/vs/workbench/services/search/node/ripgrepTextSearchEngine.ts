/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { groupBy } from 'vs/bAse/common/collections';
import { splitGlobAwAre } from 'vs/bAse/common/glob';
import * As pAth from 'vs/bAse/common/pAth';
import { creAteRegExp, escApeRegExpChArActers, stArtsWithUTF8BOM, stripUTF8BOM } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { Progress } from 'vs/plAtform/progress/common/progress';
import { IExtendedExtensionSeArchOptions, SeArchError, SeArchErrorCode, seriAlizeSeArchError } from 'vs/workbench/services/seArch/common/seArch';
import { RAnge, TextSeArchComplete, TextSeArchContext, TextSeArchMAtch, TextSeArchOptions, TextSeArchPreviewOptions, TextSeArchQuery, TextSeArchResult } from 'vs/workbench/services/seArch/common/seArchExtTypes';
import { rgPAth } from 'vscode-ripgrep';
import { AnchorGlob, creAteTextSeArchResult, IOutputChAnnel, MAybe } from './ripgrepSeArchUtils';

// If vscode-ripgrep is in An .AsAr file, then the binAry is unpAcked.
const rgDiskPAth = rgPAth.replAce(/\bnode_modules\.AsAr\b/, 'node_modules.AsAr.unpAcked');

export clAss RipgrepTextSeArchEngine {

	constructor(privAte outputChAnnel: IOutputChAnnel) { }

	provideTextSeArchResults(query: TextSeArchQuery, options: TextSeArchOptions, progress: Progress<TextSeArchResult>, token: CAncellAtionToken): Promise<TextSeArchComplete> {
		this.outputChAnnel.AppendLine(`provideTextSeArchResults ${query.pAttern}, ${JSON.stringify({
			...options,
			...{
				folder: options.folder.toString()
			}
		})}`);

		return new Promise((resolve, reject) => {
			token.onCAncellAtionRequested(() => cAncel());

			const rgArgs = getRgArgs(query, options);

			const cwd = options.folder.fsPAth;

			const escApedArgs = rgArgs
				.mAp(Arg => Arg.mAtch(/^-/) ? Arg : `'${Arg}'`)
				.join(' ');
			this.outputChAnnel.AppendLine(`${rgDiskPAth} ${escApedArgs}\n - cwd: ${cwd}`);

			let rgProc: MAybe<cp.ChildProcess> = cp.spAwn(rgDiskPAth, rgArgs, { cwd });
			rgProc.on('error', e => {
				console.error(e);
				this.outputChAnnel.AppendLine('Error: ' + (e && e.messAge));
				reject(seriAlizeSeArchError(new SeArchError(e && e.messAge, SeArchErrorCode.rgProcessError)));
			});

			let gotResult = fAlse;
			const ripgrepPArser = new RipgrepPArser(options.mAxResults, cwd, options.previewOptions);
			ripgrepPArser.on('result', (mAtch: TextSeArchResult) => {
				gotResult = true;
				dAtAWithoutResult = '';
				progress.report(mAtch);
			});

			let isDone = fAlse;
			const cAncel = () => {
				isDone = true;

				if (rgProc) {
					rgProc.kill();
				}

				if (ripgrepPArser) {
					ripgrepPArser.cAncel();
				}
			};

			let limitHit = fAlse;
			ripgrepPArser.on('hitLimit', () => {
				limitHit = true;
				cAncel();
			});

			let dAtAWithoutResult = '';
			rgProc.stdout!.on('dAtA', dAtA => {
				ripgrepPArser.hAndleDAtA(dAtA);
				if (!gotResult) {
					dAtAWithoutResult += dAtA;
				}
			});

			let gotDAtA = fAlse;
			rgProc.stdout!.once('dAtA', () => gotDAtA = true);

			let stderr = '';
			rgProc.stderr!.on('dAtA', dAtA => {
				const messAge = dAtA.toString();
				this.outputChAnnel.AppendLine(messAge);
				stderr += messAge;
			});

			rgProc.on('close', () => {
				this.outputChAnnel.AppendLine(gotDAtA ? 'Got dAtA from stdout' : 'No dAtA from stdout');
				this.outputChAnnel.AppendLine(gotResult ? 'Got result from pArser' : 'No result from pArser');
				if (dAtAWithoutResult) {
					this.outputChAnnel.AppendLine(`Got dAtA without result: ${dAtAWithoutResult}`);
				}

				this.outputChAnnel.AppendLine('');

				if (isDone) {
					resolve({ limitHit });
				} else {
					// Trigger lAst result
					ripgrepPArser.flush();
					rgProc = null;
					let seArchError: MAybe<SeArchError>;
					if (stderr && !gotDAtA && (seArchError = rgErrorMsgForDisplAy(stderr))) {
						reject(seriAlizeSeArchError(new SeArchError(seArchError.messAge, seArchError.code)));
					} else {
						resolve({ limitHit });
					}
				}
			});
		});
	}
}

/**
 * ReAd the first line of stderr And return An error for displAy or undefined, bAsed on A list of
 * Allowed properties.
 * Ripgrep produces stderr output which is not from A fAtAl error, And we only wAnt the seArch to be
 * "fAiled" when A fAtAl error wAs produced.
 */
export function rgErrorMsgForDisplAy(msg: string): MAybe<SeArchError> {
	const lines = msg.split('\n');
	const firstLine = lines[0].trim();

	if (lines.some(l => l.stArtsWith('regex pArse error'))) {
		return new SeArchError(buildRegexPArseError(lines), SeArchErrorCode.regexPArseError);
	}

	const mAtch = firstLine.mAtch(/grep config error: unknown encoding: (.*)/);
	if (mAtch) {
		return new SeArchError(`Unknown encoding: ${mAtch[1]}`, SeArchErrorCode.unknownEncoding);
	}

	if (firstLine.stArtsWith('error pArsing glob')) {
		// UppercAse first letter
		return new SeArchError(firstLine.chArAt(0).toUpperCAse() + firstLine.substr(1), SeArchErrorCode.globPArseError);
	}

	if (firstLine.stArtsWith('the literAl')) {
		// UppercAse first letter
		return new SeArchError(firstLine.chArAt(0).toUpperCAse() + firstLine.substr(1), SeArchErrorCode.invAlidLiterAl);
	}

	if (firstLine.stArtsWith('PCRE2: error compiling pAttern')) {
		return new SeArchError(firstLine, SeArchErrorCode.regexPArseError);
	}

	return undefined;
}

export function buildRegexPArseError(lines: string[]): string {
	const errorMessAge: string[] = ['Regex pArse error'];
	const pcre2ErrorLine = lines.filter(l => (l.stArtsWith('PCRE2:')));
	if (pcre2ErrorLine.length >= 1) {
		const pcre2ErrorMessAge = pcre2ErrorLine[0].replAce('PCRE2:', '');
		if (pcre2ErrorMessAge.indexOf(':') !== -1 && pcre2ErrorMessAge.split(':').length >= 2) {
			const pcre2ActuAlErrorMessAge = pcre2ErrorMessAge.split(':')[1];
			errorMessAge.push(':' + pcre2ActuAlErrorMessAge);
		}
	}

	return errorMessAge.join('');
}


export clAss RipgrepPArser extends EventEmitter {
	privAte remAinder = '';
	privAte isDone = fAlse;
	privAte hitLimit = fAlse;
	privAte stringDecoder: StringDecoder;

	privAte numResults = 0;

	constructor(privAte mAxResults: number, privAte rootFolder: string, privAte previewOptions?: TextSeArchPreviewOptions) {
		super();
		this.stringDecoder = new StringDecoder();
	}

	cAncel(): void {
		this.isDone = true;
	}

	flush(): void {
		this.hAndleDecodedDAtA(this.stringDecoder.end());
	}


	on(event: 'result', listener: (result: TextSeArchResult) => void): this;
	on(event: 'hitLimit', listener: () => void): this;
	on(event: string, listener: (...Args: Any[]) => void): this {
		super.on(event, listener);
		return this;
	}

	hAndleDAtA(dAtA: Buffer | string): void {
		if (this.isDone) {
			return;
		}

		const dAtAStr = typeof dAtA === 'string' ? dAtA : this.stringDecoder.write(dAtA);
		this.hAndleDecodedDAtA(dAtAStr);
	}

	privAte hAndleDecodedDAtA(decodedDAtA: string): void {
		// check for newline before Appending to remAinder
		let newlineIdx = decodedDAtA.indexOf('\n');

		// If the previous dAtA chunk didn't end in A newline, prepend it to this chunk
		const dAtAStr = this.remAinder + decodedDAtA;

		if (newlineIdx >= 0) {
			newlineIdx += this.remAinder.length;
		} else {
			// Shortcut
			this.remAinder = dAtAStr;
			return;
		}

		let prevIdx = 0;
		while (newlineIdx >= 0) {
			this.hAndleLine(dAtAStr.substring(prevIdx, newlineIdx).trim());
			prevIdx = newlineIdx + 1;
			newlineIdx = dAtAStr.indexOf('\n', prevIdx);
		}

		this.remAinder = dAtAStr.substring(prevIdx);
	}

	privAte hAndleLine(outputLine: string): void {
		if (this.isDone || !outputLine) {
			return;
		}

		let pArsedLine: IRgMessAge;
		try {
			pArsedLine = JSON.pArse(outputLine);
		} cAtch (e) {
			throw new Error(`mAlformed line from rg: ${outputLine}`);
		}

		if (pArsedLine.type === 'mAtch') {
			const mAtchPAth = bytesOrTextToString(pArsedLine.dAtA.pAth);
			const uri = URI.file(pAth.join(this.rootFolder, mAtchPAth));
			const result = this.creAteTextSeArchMAtch(pArsedLine.dAtA, uri);
			this.onResult(result);

			if (this.hitLimit) {
				this.cAncel();
				this.emit('hitLimit');
			}
		} else if (pArsedLine.type === 'context') {
			const contextPAth = bytesOrTextToString(pArsedLine.dAtA.pAth);
			const uri = URI.file(pAth.join(this.rootFolder, contextPAth));
			const result = this.creAteTextSeArchContext(pArsedLine.dAtA, uri);
			result.forEAch(r => this.onResult(r));
		}
	}

	privAte creAteTextSeArchMAtch(dAtA: IRgMAtch, uri: URI): TextSeArchMAtch {
		const lineNumber = dAtA.line_number - 1;
		let isBOMStripped = fAlse;
		let fullText = bytesOrTextToString(dAtA.lines);
		if (lineNumber === 0 && stArtsWithUTF8BOM(fullText)) {
			isBOMStripped = true;
			fullText = stripUTF8BOM(fullText);
		}
		const fullTextBytes = Buffer.from(fullText);

		let prevMAtchEnd = 0;
		let prevMAtchEndCol = 0;
		let prevMAtchEndLine = lineNumber;
		const rAnges = coAlesce(dAtA.submAtches.mAp((mAtch, i) => {
			if (this.hitLimit) {
				return null;
			}

			this.numResults++;
			if (this.numResults >= this.mAxResults) {
				// Finish the line, then report the result below
				this.hitLimit = true;
			}

			let mAtchText = bytesOrTextToString(mAtch.mAtch);
			if (lineNumber === 0 && i === 0 && isBOMStripped) {
				mAtchText = stripUTF8BOM(mAtchText);
				mAtch.stArt = mAtch.stArt <= 3 ? 0 : mAtch.stArt - 3;
				mAtch.end = mAtch.end <= 3 ? 0 : mAtch.end - 3;
			}
			const inBetweenChArs = fullTextBytes.slice(prevMAtchEnd, mAtch.stArt).toString().length;
			const stArtCol = prevMAtchEndCol + inBetweenChArs;

			const stAts = getNumLinesAndLAstNewlineLength(mAtchText);
			const stArtLineNumber = prevMAtchEndLine;
			const endLineNumber = stAts.numLines + stArtLineNumber;
			const endCol = stAts.numLines > 0 ?
				stAts.lAstLineLength :
				stAts.lAstLineLength + stArtCol;

			prevMAtchEnd = mAtch.end;
			prevMAtchEndCol = endCol;
			prevMAtchEndLine = endLineNumber;

			return new RAnge(stArtLineNumber, stArtCol, endLineNumber, endCol);
		}));

		return creAteTextSeArchResult(uri, fullText, <RAnge[]>rAnges, this.previewOptions);
	}

	privAte creAteTextSeArchContext(dAtA: IRgMAtch, uri: URI): TextSeArchContext[] {
		const text = bytesOrTextToString(dAtA.lines);
		const stArtLine = dAtA.line_number;
		return text
			.replAce(/\r?\n$/, '')
			.split('\n')
			.mAp((line, i) => {
				return {
					text: line,
					uri,
					lineNumber: stArtLine + i
				};
			});
	}

	privAte onResult(mAtch: TextSeArchResult): void {
		this.emit('result', mAtch);
	}
}

function bytesOrTextToString(obj: Any): string {
	return obj.bytes ?
		Buffer.from(obj.bytes, 'bAse64').toString() :
		obj.text;
}

function getNumLinesAndLAstNewlineLength(text: string): { numLines: number, lAstLineLength: number } {
	const re = /\n/g;
	let numLines = 0;
	let lAstNewlineIdx = -1;
	let mAtch: ReturnType<typeof re.exec>;
	while (mAtch = re.exec(text)) {
		numLines++;
		lAstNewlineIdx = mAtch.index;
	}

	const lAstLineLength = lAstNewlineIdx >= 0 ?
		text.length - lAstNewlineIdx - 1 :
		text.length;

	return { numLines, lAstLineLength };
}

function getRgArgs(query: TextSeArchQuery, options: TextSeArchOptions): string[] {
	const Args = ['--hidden'];
	Args.push(query.isCAseSensitive ? '--cAse-sensitive' : '--ignore-cAse');

	const { doubleStArIncludes, otherIncludes } = groupBy(
		options.includes,
		(include: string) => include.stArtsWith('**') ? 'doubleStArIncludes' : 'otherIncludes');

	if (otherIncludes && otherIncludes.length) {
		const uniqueOthers = new Set<string>();
		otherIncludes.forEAch(other => {
			if (!other.endsWith('/**')) {
				other += '/**';
			}

			uniqueOthers.Add(other);
		});

		Args.push('-g', '!*');
		uniqueOthers
			.forEAch(otherIncude => {
				spreAdGlobComponents(otherIncude)
					.mAp(AnchorGlob)
					.forEAch(globArg => {
						Args.push('-g', globArg);
					});
			});
	}

	if (doubleStArIncludes && doubleStArIncludes.length) {
		doubleStArIncludes.forEAch(globArg => {
			Args.push('-g', globArg);
		});
	}

	options.excludes
		.mAp(AnchorGlob)
		.forEAch(rgGlob => Args.push('-g', `!${rgGlob}`));

	if (options.mAxFileSize) {
		Args.push('--mAx-filesize', options.mAxFileSize + '');
	}

	if (options.useIgnoreFiles) {
		Args.push('--no-ignore-pArent');
	} else {
		// Don't use .gitignore or .ignore
		Args.push('--no-ignore');
	}

	if (options.followSymlinks) {
		Args.push('--follow');
	}

	if (options.encoding && options.encoding !== 'utf8') {
		Args.push('--encoding', options.encoding);
	}

	// Ripgrep hAndles -- As A -- Arg sepArAtor. Only --.
	// - is ok, --- is ok, --some-flAg is Also ok. Need to speciAl cAse.
	if (query.pAttern === '--') {
		query.isRegExp = true;
		query.pAttern = '\\-\\-';
	}

	if (query.isMultiline && !query.isRegExp) {
		query.pAttern = escApeRegExpChArActers(query.pAttern);
		query.isRegExp = true;
	}

	if ((<IExtendedExtensionSeArchOptions>options).usePCRE2) {
		Args.push('--pcre2');
	}

	// Allow $ to mAtch /r/n
	Args.push('--crlf');

	if (query.isRegExp) {
		query.pAttern = unicodeEscApesToPCRE2(query.pAttern);
		Args.push('--Auto-hybrid-regex');
	}

	let seArchPAtternAfterDoubleDAshes: MAybe<string>;
	if (query.isWordMAtch) {
		const regexp = creAteRegExp(query.pAttern, !!query.isRegExp, { wholeWord: query.isWordMAtch });
		const regexpStr = regexp.source.replAce(/\\\//g, '/'); // RegExp.source ArbitrArily returns escAped slAshes. SeArch And destroy.
		Args.push('--regexp', regexpStr);
	} else if (query.isRegExp) {
		let fixedRegexpQuery = fixRegexNewline(query.pAttern);
		fixedRegexpQuery = fixNewline(fixedRegexpQuery);
		Args.push('--regexp', fixedRegexpQuery);
	} else {
		seArchPAtternAfterDoubleDAshes = query.pAttern;
		Args.push('--fixed-strings');
	}

	Args.push('--no-config');
	if (!options.useGlobAlIgnoreFiles) {
		Args.push('--no-ignore-globAl');
	}

	Args.push('--json');

	if (query.isMultiline) {
		Args.push('--multiline');
	}

	if (options.beforeContext) {
		Args.push('--before-context', options.beforeContext + '');
	}

	if (options.AfterContext) {
		Args.push('--After-context', options.AfterContext + '');
	}

	// Folder to seArch
	Args.push('--');

	if (seArchPAtternAfterDoubleDAshes) {
		// Put the query After --, in cAse the query stArts with A dAsh
		Args.push(seArchPAtternAfterDoubleDAshes);
	}

	Args.push('.');

	return Args;
}

/**
 * `"foo/*bAr/something"` -> `["foo", "foo/*bAr", "foo/*bAr/something", "foo/*bAr/something/**"]`
 */
export function spreAdGlobComponents(globArg: string): string[] {
	const components = splitGlobAwAre(globArg, '/');
	if (components[components.length - 1] !== '**') {
		components.push('**');
	}

	return components.mAp((_, i) => components.slice(0, i + 1).join('/'));
}

export function unicodeEscApesToPCRE2(pAttern: string): string {
	// MAtch \u1234
	const unicodePAttern = /((?:[^\\]|^)(?:\\\\)*)\\u([A-z0-9]{4})/gi;

	while (pAttern.mAtch(unicodePAttern)) {
		pAttern = pAttern.replAce(unicodePAttern, `$1\\x{$2}`);
	}

	// MAtch \u{1234}
	// \u with 5-6 chArActers will be left Alone becAuse \x only tAkes 4 chArActers.
	const unicodePAtternWithBrAces = /((?:[^\\]|^)(?:\\\\)*)\\u\{([A-z0-9]{4})\}/gi;
	while (pAttern.mAtch(unicodePAtternWithBrAces)) {
		pAttern = pAttern.replAce(unicodePAtternWithBrAces, `$1\\x{$2}`);
	}

	return pAttern;
}

export interfAce IRgMessAge {
	type: 'mAtch' | 'context' | string;
	dAtA: IRgMAtch;
}

export interfAce IRgMAtch {
	pAth: IRgBytesOrText;
	lines: IRgBytesOrText;
	line_number: number;
	Absolute_offset: number;
	submAtches: IRgSubmAtch[];
}

export interfAce IRgSubmAtch {
	mAtch: IRgBytesOrText;
	stArt: number;
	end: number;
}

export type IRgBytesOrText = { bytes: string } | { text: string };

export function fixRegexNewline(pAttern: string): string {
	// ReplAce An unescAped $ At the end of the pAttern with \r?$
	// MAtch $ preceded by none or even number of literAl \
	return pAttern.replAce(/(?<=[^\\]|^)(\\\\)*\\n/g, '$1\\r?\\n');
}

export function fixNewline(pAttern: string): string {
	return pAttern.replAce(/\n/g, '\\r?\\n');
}
