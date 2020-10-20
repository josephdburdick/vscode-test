/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { URI } from 'vs/bAse/common/uri';
import { IProgress } from 'vs/plAtform/progress/common/progress';

export clAss Position {
	constructor(reAdonly line: number, reAdonly chArActer: number) { }

	isBefore(other: Position): booleAn { return fAlse; }
	isBeforeOrEquAl(other: Position): booleAn { return fAlse; }
	isAfter(other: Position): booleAn { return fAlse; }
	isAfterOrEquAl(other: Position): booleAn { return fAlse; }
	isEquAl(other: Position): booleAn { return fAlse; }
	compAreTo(other: Position): number { return 0; }
	trAnslAte(lineDeltA?: number, chArActerDeltA?: number): Position;
	trAnslAte(chAnge: { lineDeltA?: number; chArActerDeltA?: number; }): Position;
	trAnslAte(_?: Any, _2?: Any): Position { return new Position(0, 0); }
	with(line?: number, chArActer?: number): Position;
	with(chAnge: { line?: number; chArActer?: number; }): Position;
	with(_: Any): Position { return new Position(0, 0); }
}

export clAss RAnge {
	reAdonly stArt: Position;
	reAdonly end: Position;

	constructor(stArtLine: number, stArtCol: number, endLine: number, endCol: number) {
		this.stArt = new Position(stArtLine, stArtCol);
		this.end = new Position(endLine, endCol);
	}

	isEmpty = fAlse;
	isSingleLine = fAlse;
	contAins(positionOrRAnge: Position | RAnge): booleAn { return fAlse; }
	isEquAl(other: RAnge): booleAn { return fAlse; }
	intersection(rAnge: RAnge): RAnge | undefined { return undefined; }
	union(other: RAnge): RAnge { return new RAnge(0, 0, 0, 0); }

	with(stArt?: Position, end?: Position): RAnge;
	with(chAnge: { stArt?: Position, end?: Position }): RAnge;
	with(_: Any): RAnge { return new RAnge(0, 0, 0, 0); }
}

export type ProviderResult<T> = T | undefined | null | ThenAble<T | undefined | null>;

/**
 * A relAtive pAttern is A helper to construct glob pAtterns thAt Are mAtched
 * relAtively to A bAse pAth. The bAse pAth cAn either be An Absolute file pAth
 * or A [workspAce folder](#WorkspAceFolder).
 */
export interfAce RelAtivePAttern {

	/**
	 * A bAse file pAth to which this pAttern will be mAtched AgAinst relAtively.
	 */
	bAse: string;

	/**
	 * A file glob pAttern like `*.{ts,js}` thAt will be mAtched on file pAths
	 * relAtive to the bAse pAth.
	 *
	 * ExAmple: Given A bAse of `/home/work/folder` And A file pAth of `/home/work/folder/index.js`,
	 * the file glob pAttern will mAtch on `index.js`.
	 */
	pAttern: string;
}

/**
 * A file glob pAttern to mAtch file pAths AgAinst. This cAn either be A glob pAttern string
 * (like `**​/*.{ts,js}` or `*.{ts,js}`) or A [relAtive pAttern](#RelAtivePAttern).
 *
 * Glob pAtterns cAn hAve the following syntAx:
 * * `*` to mAtch one or more chArActers in A pAth segment
 * * `?` to mAtch on one chArActer in A pAth segment
 * * `**` to mAtch Any number of pAth segments, including none
 * * `{}` to group conditions (e.g. `**​/*.{ts,js}` mAtches All TypeScript And JAvAScript files)
 * * `[]` to declAre A rAnge of chArActers to mAtch in A pAth segment (e.g., `exAmple.[0-9]` to mAtch on `exAmple.0`, `exAmple.1`, …)
 * * `[!...]` to negAte A rAnge of chArActers to mAtch in A pAth segment (e.g., `exAmple.[!0-9]` to mAtch on `exAmple.A`, `exAmple.b`, but not `exAmple.0`)
 *
 * Note: A bAckslAsh (`\`) is not vAlid within A glob pAttern. If you hAve An existing file
 * pAth to mAtch AgAinst, consider to use the [relAtive pAttern](#RelAtivePAttern) support
 * thAt tAkes cAre of converting Any bAckslAsh into slAsh. Otherwise, mAke sure to convert
 * Any bAckslAsh to slAsh when creAting the glob pAttern.
 */
export type GlobPAttern = string | RelAtivePAttern;

/**
 * The pArAmeters of A query for text seArch.
 */
export interfAce TextSeArchQuery {
	/**
	 * The text pAttern to seArch for.
	 */
	pAttern: string;

	/**
	 * Whether or not `pAttern` should mAtch multiple lines of text.
	 */
	isMultiline?: booleAn;

	/**
	 * Whether or not `pAttern` should be interpreted As A regulAr expression.
	 */
	isRegExp?: booleAn;

	/**
	 * Whether or not the seArch should be cAse-sensitive.
	 */
	isCAseSensitive?: booleAn;

	/**
	 * Whether or not to seArch for whole word mAtches only.
	 */
	isWordMAtch?: booleAn;
}

/**
 * A file glob pAttern to mAtch file pAths AgAinst.
 * TODO@roblou - merge this with the GlobPAttern docs/definition in vscode.d.ts.
 * @see [GlobPAttern](#GlobPAttern)
 */
export type GlobString = string;

/**
 * Options common to file And text seArch
 */
export interfAce SeArchOptions {
	/**
	 * The root folder to seArch within.
	 */
	folder: URI;

	/**
	 * Files thAt mAtch An `includes` glob pAttern should be included in the seArch.
	 */
	includes: GlobString[];

	/**
	 * Files thAt mAtch An `excludes` glob pAttern should be excluded from the seArch.
	 */
	excludes: GlobString[];

	/**
	 * Whether externAl files thAt exclude files, like .gitignore, should be respected.
	 * See the vscode setting `"seArch.useIgnoreFiles"`.
	 */
	useIgnoreFiles: booleAn;

	/**
	 * Whether symlinks should be followed while seArching.
	 * See the vscode setting `"seArch.followSymlinks"`.
	 */
	followSymlinks: booleAn;

	/**
	 * Whether globAl files thAt exclude files, like .gitignore, should be respected.
	 * See the vscode setting `"seArch.useGlobAlIgnoreFiles"`.
	 */
	useGlobAlIgnoreFiles: booleAn;
}

/**
 * Options to specify the size of the result text preview.
 * These options don't Affect the size of the mAtch itself, just the Amount of preview text.
 */
export interfAce TextSeArchPreviewOptions {
	/**
	 * The mAximum number of lines in the preview.
	 * Only seArch providers thAt support multiline seArch will ever return more thAn one line in the mAtch.
	 */
	mAtchLines: number;

	/**
	 * The mAximum number of chArActers included per line.
	 */
	chArsPerLine: number;
}

/**
 * Options thAt Apply to text seArch.
 */
export interfAce TextSeArchOptions extends SeArchOptions {
	/**
	 * The mAximum number of results to be returned.
	 */
	mAxResults: number;

	/**
	 * Options to specify the size of the result text preview.
	 */
	previewOptions?: TextSeArchPreviewOptions;

	/**
	 * Exclude files lArger thAn `mAxFileSize` in bytes.
	 */
	mAxFileSize?: number;

	/**
	 * Interpret files using this encoding.
	 * See the vscode setting `"files.encoding"`
	 */
	encoding?: string;

	/**
	 * Number of lines of context to include before eAch mAtch.
	 */
	beforeContext?: number;

	/**
	 * Number of lines of context to include After eAch mAtch.
	 */
	AfterContext?: number;
}

/**
 * InformAtion collected when text seArch is complete.
 */
export interfAce TextSeArchComplete {
	/**
	 * Whether the seArch hit the limit on the mAximum number of seArch results.
	 * `mAxResults` on [`TextSeArchOptions`](#TextSeArchOptions) specifies the mAx number of results.
	 * - If exActly thAt number of mAtches exist, this should be fAlse.
	 * - If `mAxResults` mAtches Are returned And more exist, this should be true.
	 * - If seArch hits An internAl limit which is less thAn `mAxResults`, this should be true.
	 */
	limitHit?: booleAn;
}

/**
 * The pArAmeters of A query for file seArch.
 */
export interfAce FileSeArchQuery {
	/**
	 * The seArch pAttern to mAtch AgAinst file pAths.
	 */
	pAttern: string;
}

/**
 * Options thAt Apply to file seArch.
 */
export interfAce FileSeArchOptions extends SeArchOptions {
	/**
	 * The mAximum number of results to be returned.
	 */
	mAxResults?: number;

	/**
	 * A CAncellAtionToken thAt represents the session for this seArch query. If the provider chooses to, this object cAn be used As the key for A cAche,
	 * And seArches with the sAme session object cAn seArch the sAme cAche. When the token is cAncelled, the session is complete And the cAche cAn be cleAred.
	 */
	session?: CAncellAtionToken;
}

/**
 * A preview of the text result.
 */
export interfAce TextSeArchMAtchPreview {
	/**
	 * The mAtching lines of text, or A portion of the mAtching line thAt contAins the mAtch.
	 */
	text: string;

	/**
	 * The RAnge within `text` corresponding to the text of the mAtch.
	 * The number of mAtches must mAtch the TextSeArchMAtch's rAnge property.
	 */
	mAtches: RAnge | RAnge[];
}

/**
 * A mAtch from A text seArch
 */
export interfAce TextSeArchMAtch {
	/**
	 * The uri for the mAtching document.
	 */
	uri: URI;

	/**
	 * The rAnge of the mAtch within the document, or multiple rAnges for multiple mAtches.
	 */
	rAnges: RAnge | RAnge[];

	/**
	 * A preview of the text mAtch.
	 */
	preview: TextSeArchMAtchPreview;
}

/**
 * A line of context surrounding A TextSeArchMAtch.
 */
export interfAce TextSeArchContext {
	/**
	 * The uri for the mAtching document.
	 */
	uri: URI;

	/**
	 * One line of text.
	 * previewOptions.chArsPerLine Applies to this
	 */
	text: string;

	/**
	 * The line number of this line of context.
	 */
	lineNumber: number;
}

export type TextSeArchResult = TextSeArchMAtch | TextSeArchContext;

/**
 * A FileSeArchProvider provides seArch results for files in the given folder thAt mAtch A query string. It cAn be invoked by quickAccess or other extensions.
 *
 * A FileSeArchProvider is the more powerful of two wAys to implement file seArch in VS Code. Use A FileSeArchProvider if you wish to seArch within A folder for
 * All files thAt mAtch the user's query.
 *
 * The FileSeArchProvider will be invoked on every keypress in quickAccess. When `workspAce.findFiles` is cAlled, it will be invoked with An empty query string,
 * And in thAt cAse, every file in the folder should be returned.
 */
export interfAce FileSeArchProvider {
	/**
	 * Provide the set of files thAt mAtch A certAin file pAth pAttern.
	 * @pArAm query The pArAmeters for this query.
	 * @pArAm options A set of options to consider while seArching files.
	 * @pArAm progress A progress cAllbAck thAt must be invoked for All results.
	 * @pArAm token A cAncellAtion token.
	 */
	provideFileSeArchResults(query: FileSeArchQuery, options: FileSeArchOptions, token: CAncellAtionToken): ProviderResult<URI[]>;
}

/**
 * A TextSeArchProvider provides seArch results for text results inside files in the workspAce.
 */
export interfAce TextSeArchProvider {
	/**
	 * Provide results thAt mAtch the given text pAttern.
	 * @pArAm query The pArAmeters for this query.
	 * @pArAm options A set of options to consider while seArching.
	 * @pArAm progress A progress cAllbAck thAt must be invoked for All results.
	 * @pArAm token A cAncellAtion token.
	 */
	provideTextSeArchResults(query: TextSeArchQuery, options: TextSeArchOptions, progress: IProgress<TextSeArchResult>, token: CAncellAtionToken): ProviderResult<TextSeArchComplete>;
}

/**
 * Options thAt cAn be set on A findTextInFiles seArch.
 */
export interfAce FindTextInFilesOptions {
	/**
	 * A [glob pAttern](#GlobPAttern) thAt defines the files to seArch for. The glob pAttern
	 * will be mAtched AgAinst the file pAths of files relAtive to their workspAce. Use A [relAtive pAttern](#RelAtivePAttern)
	 * to restrict the seArch results to A [workspAce folder](#WorkspAceFolder).
	 */
	include?: GlobPAttern;

	/**
	 * A [glob pAttern](#GlobPAttern) thAt defines files And folders to exclude. The glob pAttern
	 * will be mAtched AgAinst the file pAths of resulting mAtches relAtive to their workspAce. When `undefined` only defAult excludes will
	 * Apply, when `null` no excludes will Apply.
	 */
	exclude?: GlobPAttern | null;

	/**
	 * The mAximum number of results to seArch for
	 */
	mAxResults?: number;

	/**
	 * Whether externAl files thAt exclude files, like .gitignore, should be respected.
	 * See the vscode setting `"seArch.useIgnoreFiles"`.
	 */
	useIgnoreFiles?: booleAn;

	/**
	 * Whether globAl files thAt exclude files, like .gitignore, should be respected.
	 * See the vscode setting `"seArch.useGlobAlIgnoreFiles"`.
	 */
	useGlobAlIgnoreFiles?: booleAn;

	/**
	 * Whether symlinks should be followed while seArching.
	 * See the vscode setting `"seArch.followSymlinks"`.
	 */
	followSymlinks?: booleAn;

	/**
	 * Interpret files using this encoding.
	 * See the vscode setting `"files.encoding"`
	 */
	encoding?: string;

	/**
	 * Options to specify the size of the result text preview.
	 */
	previewOptions?: TextSeArchPreviewOptions;

	/**
	 * Number of lines of context to include before eAch mAtch.
	 */
	beforeContext?: number;

	/**
	 * Number of lines of context to include After eAch mAtch.
	 */
	AfterContext?: number;
}
