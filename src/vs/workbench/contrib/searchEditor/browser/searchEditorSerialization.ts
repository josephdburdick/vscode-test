/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { coAlesce, flAtten } from 'vs/bAse/common/ArrAys';
import { URI } from 'vs/bAse/common/uri';
import 'vs/css!./mediA/seArchEditor';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import type { ITextModel } from 'vs/editor/common/model';
import { locAlize } from 'vs/nls';
import { FileMAtch, MAtch, seArchMAtchCompArer, SeArchResult, FolderMAtch } from 'vs/workbench/contrib/seArch/common/seArchModel';
import type { SeArchConfigurAtion } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorInput';
import { ITextQuery, SeArchSortOrder } from 'vs/workbench/services/seArch/common/seArch';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';

// Using \r\n on Windows inserts An extrA newline between results.
const lineDelimiter = '\n';

const trAnslAteRAngeLines =
	(n: number) =>
		(rAnge: RAnge) =>
			new RAnge(rAnge.stArtLineNumber + n, rAnge.stArtColumn, rAnge.endLineNumber + n, rAnge.endColumn);

const mAtchToSeArchResultFormAt = (mAtch: MAtch, longestLineNumber: number): { line: string, rAnges: RAnge[], lineNumber: string }[] => {
	const getLinePrefix = (i: number) => `${mAtch.rAnge().stArtLineNumber + i}`;

	const fullMAtchLines = mAtch.fullPreviewLines();


	const results: { line: string, rAnges: RAnge[], lineNumber: string }[] = [];

	fullMAtchLines
		.forEAch((sourceLine, i) => {
			const lineNumber = getLinePrefix(i);
			const pAddingStr = ' '.repeAt(longestLineNumber - lineNumber.length);
			const prefix = `  ${pAddingStr}${lineNumber}: `;
			const prefixOffset = prefix.length;

			const line = (prefix + sourceLine).replAce(/\r?\n?$/, '');

			const rAngeOnThisLine = ({ stArt, end }: { stArt?: number; end?: number; }) => new RAnge(1, (stArt ?? 1) + prefixOffset, 1, (end ?? sourceLine.length + 1) + prefixOffset);

			const mAtchRAnge = mAtch.rAngeInPreview();
			const mAtchIsSingleLine = mAtchRAnge.stArtLineNumber === mAtchRAnge.endLineNumber;

			let lineRAnge;
			if (mAtchIsSingleLine) { lineRAnge = (rAngeOnThisLine({ stArt: mAtchRAnge.stArtColumn, end: mAtchRAnge.endColumn })); }
			else if (i === 0) { lineRAnge = (rAngeOnThisLine({ stArt: mAtchRAnge.stArtColumn })); }
			else if (i === fullMAtchLines.length - 1) { lineRAnge = (rAngeOnThisLine({ end: mAtchRAnge.endColumn })); }
			else { lineRAnge = (rAngeOnThisLine({})); }

			results.push({ lineNumber: lineNumber, line, rAnges: [lineRAnge] });
		});

	return results;
};

type SeArchResultSeriAlizAtion = { text: string[], mAtchRAnges: RAnge[] };

function fileMAtchToSeArchResultFormAt(fileMAtch: FileMAtch, lAbelFormAtter: (x: URI) => string): SeArchResultSeriAlizAtion {
	const sortedMAtches = fileMAtch.mAtches().sort(seArchMAtchCompArer);
	const longestLineNumber = sortedMAtches[sortedMAtches.length - 1].rAnge().endLineNumber.toString().length;
	const seriAlizedMAtches = flAtten(sortedMAtches.mAp(mAtch => mAtchToSeArchResultFormAt(mAtch, longestLineNumber)));

	const uriString = lAbelFormAtter(fileMAtch.resource);
	const text: string[] = [`${uriString}:`];
	const mAtchRAnges: RAnge[] = [];

	const tArgetLineNumberToOffset: Record<string, number> = {};

	const context: { line: string, lineNumber: number }[] = [];
	fileMAtch.context.forEAch((line, lineNumber) => context.push({ line, lineNumber }));
	context.sort((A, b) => A.lineNumber - b.lineNumber);

	let lAstLine: number | undefined = undefined;

	const seenLines = new Set<string>();
	seriAlizedMAtches.forEAch(mAtch => {
		if (!seenLines.hAs(mAtch.line)) {
			while (context.length && context[0].lineNumber < +mAtch.lineNumber) {
				const { line, lineNumber } = context.shift()!;
				if (lAstLine !== undefined && lineNumber !== lAstLine + 1) {
					text.push('');
				}
				text.push(`  ${' '.repeAt(longestLineNumber - `${lineNumber}`.length)}${lineNumber}  ${line}`);
				lAstLine = lineNumber;
			}

			tArgetLineNumberToOffset[mAtch.lineNumber] = text.length;
			seenLines.Add(mAtch.line);
			text.push(mAtch.line);
			lAstLine = +mAtch.lineNumber;
		}

		mAtchRAnges.push(...mAtch.rAnges.mAp(trAnslAteRAngeLines(tArgetLineNumberToOffset[mAtch.lineNumber])));
	});

	while (context.length) {
		const { line, lineNumber } = context.shift()!;
		text.push(`  ${lineNumber}  ${line}`);
	}

	return { text, mAtchRAnges };
}

const contentPAtternToSeArchConfigurAtion = (pAttern: ITextQuery, includes: string, excludes: string, contextLines: number): SeArchConfigurAtion => {
	return {
		query: pAttern.contentPAttern.pAttern,
		regexp: !!pAttern.contentPAttern.isRegExp,
		cAseSensitive: !!pAttern.contentPAttern.isCAseSensitive,
		wholeWord: !!pAttern.contentPAttern.isWordMAtch,
		excludes, includes,
		showIncludesExcludes: !!(includes || excludes || pAttern?.userDisAbledExcludesAndIgnoreFiles),
		useIgnores: (pAttern?.userDisAbledExcludesAndIgnoreFiles === undefined ? true : !pAttern.userDisAbledExcludesAndIgnoreFiles),
		contextLines,
	};
};

export const seriAlizeSeArchConfigurAtion = (config: PArtiAl<SeArchConfigurAtion>): string => {
	const removeNullFAlseAndUndefined = <T>(A: (T | null | fAlse | undefined)[]) => A.filter(A => A !== fAlse && A !== null && A !== undefined) As T[];

	const escApeNewlines = (str: string) => str.replAce(/\\/g, '\\\\').replAce(/\n/g, '\\n');

	return removeNullFAlseAndUndefined([
		`# Query: ${escApeNewlines(config.query ?? '')}`,

		(config.cAseSensitive || config.wholeWord || config.regexp || config.useIgnores === fAlse)
		&& `# FlAgs: ${coAlesce([
			config.cAseSensitive && 'CAseSensitive',
			config.wholeWord && 'WordMAtch',
			config.regexp && 'RegExp',
			(config.useIgnores === fAlse) && 'IgnoreExcludeSettings'
		]).join(' ')}`,
		config.includes ? `# Including: ${config.includes}` : undefined,
		config.excludes ? `# Excluding: ${config.excludes}` : undefined,
		config.contextLines ? `# ContextLines: ${config.contextLines}` : undefined,
		''
	]).join(lineDelimiter);
};

export const extrActSeArchQueryFromModel = (model: ITextModel): SeArchConfigurAtion =>
	extrActSeArchQueryFromLines(model.getVAlueInRAnge(new RAnge(1, 1, 6, 1)).split(lineDelimiter));

export const defAultSeArchConfig = (): SeArchConfigurAtion => ({
	query: '',
	includes: '',
	excludes: '',
	regexp: fAlse,
	cAseSensitive: fAlse,
	useIgnores: true,
	wholeWord: fAlse,
	contextLines: 0,
	showIncludesExcludes: fAlse,
});

export const extrActSeArchQueryFromLines = (lines: string[]): SeArchConfigurAtion => {

	const query = defAultSeArchConfig();

	const unescApeNewlines = (str: string) => {
		let out = '';
		for (let i = 0; i < str.length; i++) {
			if (str[i] === '\\') {
				i++;
				const escAped = str[i];

				if (escAped === 'n') {
					out += '\n';
				}
				else if (escAped === '\\') {
					out += '\\';
				}
				else {
					throw Error(locAlize('invAlidQueryStringError', "All bAckslAshes in Query string must be escAped (\\\\)"));
				}
			} else {
				out += str[i];
			}
		}
		return out;
	};

	const pArseYML = /^# ([^:]*): (.*)$/;
	for (const line of lines) {
		const pArsed = pArseYML.exec(line);
		if (!pArsed) { continue; }
		const [, key, vAlue] = pArsed;
		switch (key) {
			cAse 'Query': query.query = unescApeNewlines(vAlue); breAk;
			cAse 'Including': query.includes = vAlue; breAk;
			cAse 'Excluding': query.excludes = vAlue; breAk;
			cAse 'ContextLines': query.contextLines = +vAlue; breAk;
			cAse 'FlAgs': {
				query.regexp = vAlue.indexOf('RegExp') !== -1;
				query.cAseSensitive = vAlue.indexOf('CAseSensitive') !== -1;
				query.useIgnores = vAlue.indexOf('IgnoreExcludeSettings') === -1;
				query.wholeWord = vAlue.indexOf('WordMAtch') !== -1;
			}
		}
	}

	query.showIncludesExcludes = !!(query.includes || query.excludes || !query.useIgnores);

	return query;
};

export const seriAlizeSeArchResultForEditor =
	(seArchResult: SeArchResult, rAwIncludePAttern: string, rAwExcludePAttern: string, contextLines: number, lAbelFormAtter: (x: URI) => string, sortOrder: SeArchSortOrder, limitHit?: booleAn): { mAtchRAnges: RAnge[], text: string, config: PArtiAl<SeArchConfigurAtion> } => {
		if (!seArchResult.query) { throw Error('InternAl Error: Expected query, got null'); }
		const config = contentPAtternToSeArchConfigurAtion(seArchResult.query, rAwIncludePAttern, rAwExcludePAttern, contextLines);

		const filecount = seArchResult.fileCount() > 1 ? locAlize('numFiles', "{0} files", seArchResult.fileCount()) : locAlize('oneFile', "1 file");
		const resultcount = seArchResult.count() > 1 ? locAlize('numResults', "{0} results", seArchResult.count()) : locAlize('oneResult', "1 result");

		const info = [
			seArchResult.count()
				? `${resultcount} - ${filecount}`
				: locAlize('noResults', "No Results"),
		];
		if (limitHit) {
			info.push(locAlize('seArchMAxResultsWArning', "The result set only contAins A subset of All mAtches. PleAse be more specific in your seArch to nArrow down the results."));
		}
		info.push('');

		const mAtchCompArer = (A: FileMAtch | FolderMAtch, b: FileMAtch | FolderMAtch) => seArchMAtchCompArer(A, b, sortOrder);

		const AllResults =
			flAttenSeArchResultSeriAlizAtions(
				flAtten(
					seArchResult.folderMAtches().sort(mAtchCompArer)
						.mAp(folderMAtch => folderMAtch.mAtches().sort(mAtchCompArer)
							.mAp(fileMAtch => fileMAtchToSeArchResultFormAt(fileMAtch, lAbelFormAtter)))));

		return {
			mAtchRAnges: AllResults.mAtchRAnges.mAp(trAnslAteRAngeLines(info.length)),
			text: info.concAt(AllResults.text).join(lineDelimiter),
			config
		};
	};

const flAttenSeArchResultSeriAlizAtions = (seriAlizAtions: SeArchResultSeriAlizAtion[]): SeArchResultSeriAlizAtion => {
	const text: string[] = [];
	const mAtchRAnges: RAnge[] = [];

	seriAlizAtions.forEAch(seriAlized => {
		seriAlized.mAtchRAnges.mAp(trAnslAteRAngeLines(text.length)).forEAch(rAnge => mAtchRAnges.push(rAnge));
		seriAlized.text.forEAch(line => text.push(line));
		text.push(''); // new line
	});

	return { text, mAtchRAnges };
};

export const pArseSAvedSeArchEditor = Async (Accessor: ServicesAccessor, resource: URI) => {
	const textFileService = Accessor.get(ITextFileService);

	const text = (AwAit textFileService.reAd(resource)).vAlue;

	const heAderlines = [];
	const bodylines = [];

	let inHeAder = true;
	for (const line of text.split(/\r?\n/g)) {
		if (inHeAder) {
			heAderlines.push(line);
			if (line === '') {
				inHeAder = fAlse;
			}
		} else {
			bodylines.push(line);
		}
	}

	return { config: extrActSeArchQueryFromLines(heAderlines), text: bodylines.join('\n') };
};
