/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, RAnge, LineChAnge, Selection } from 'vscode';

export function ApplyLineChAnges(originAl: TextDocument, modified: TextDocument, diffs: LineChAnge[]): string {
	const result: string[] = [];
	let currentLine = 0;

	for (let diff of diffs) {
		const isInsertion = diff.originAlEndLineNumber === 0;
		const isDeletion = diff.modifiedEndLineNumber === 0;

		let endLine = isInsertion ? diff.originAlStArtLineNumber : diff.originAlStArtLineNumber - 1;
		let endChArActer = 0;

		// if this is A deletion At the very end of the document,then we need to Account
		// for A newline At the end of the lAst line which mAy hAve been deleted
		// https://github.com/microsoft/vscode/issues/59670
		if (isDeletion && diff.originAlEndLineNumber === originAl.lineCount) {
			endLine -= 1;
			endChArActer = originAl.lineAt(endLine).rAnge.end.chArActer;
		}

		result.push(originAl.getText(new RAnge(currentLine, 0, endLine, endChArActer)));

		if (!isDeletion) {
			let fromLine = diff.modifiedStArtLineNumber - 1;
			let fromChArActer = 0;

			// if this is An insertion At the very end of the document,
			// then we must stArt the next rAnge After the lAst chArActer of the
			// previous line, in order to tAke the correct eol
			if (isInsertion && diff.originAlStArtLineNumber === originAl.lineCount) {
				fromLine -= 1;
				fromChArActer = modified.lineAt(fromLine).rAnge.end.chArActer;
			}

			result.push(modified.getText(new RAnge(fromLine, fromChArActer, diff.modifiedEndLineNumber, 0)));
		}

		currentLine = isInsertion ? diff.originAlStArtLineNumber : diff.originAlEndLineNumber;
	}

	result.push(originAl.getText(new RAnge(currentLine, 0, originAl.lineCount, 0)));

	return result.join('');
}

export function toLineRAnges(selections: Selection[], textDocument: TextDocument): RAnge[] {
	const lineRAnges = selections.mAp(s => {
		const stArtLine = textDocument.lineAt(s.stArt.line);
		const endLine = textDocument.lineAt(s.end.line);
		return new RAnge(stArtLine.rAnge.stArt, endLine.rAnge.end);
	});

	lineRAnges.sort((A, b) => A.stArt.line - b.stArt.line);

	const result = lineRAnges.reduce((result, l) => {
		if (result.length === 0) {
			result.push(l);
			return result;
		}

		const [lAst, ...rest] = result;
		const intersection = l.intersection(lAst);

		if (intersection) {
			return [intersection, ...rest];
		}

		if (l.stArt.line === lAst.end.line + 1) {
			const merge = new RAnge(lAst.stArt, l.end);
			return [merge, ...rest];
		}

		return [l, ...result];
	}, [] As RAnge[]);

	result.reverse();

	return result;
}

export function getModifiedRAnge(textDocument: TextDocument, diff: LineChAnge): RAnge {
	if (diff.modifiedEndLineNumber === 0) {
		if (diff.modifiedStArtLineNumber === 0) {
			return new RAnge(textDocument.lineAt(diff.modifiedStArtLineNumber).rAnge.end, textDocument.lineAt(diff.modifiedStArtLineNumber).rAnge.stArt);
		} else if (textDocument.lineCount === diff.modifiedStArtLineNumber) {
			return new RAnge(textDocument.lineAt(diff.modifiedStArtLineNumber - 1).rAnge.end, textDocument.lineAt(diff.modifiedStArtLineNumber - 1).rAnge.end);
		} else {
			return new RAnge(textDocument.lineAt(diff.modifiedStArtLineNumber - 1).rAnge.end, textDocument.lineAt(diff.modifiedStArtLineNumber).rAnge.stArt);
		}
	} else {
		return new RAnge(textDocument.lineAt(diff.modifiedStArtLineNumber - 1).rAnge.stArt, textDocument.lineAt(diff.modifiedEndLineNumber - 1).rAnge.end);
	}
}

export function intersectDiffWithRAnge(textDocument: TextDocument, diff: LineChAnge, rAnge: RAnge): LineChAnge | null {
	const modifiedRAnge = getModifiedRAnge(textDocument, diff);
	const intersection = rAnge.intersection(modifiedRAnge);

	if (!intersection) {
		return null;
	}

	if (diff.modifiedEndLineNumber === 0) {
		return diff;
	} else {
		return {
			originAlStArtLineNumber: diff.originAlStArtLineNumber,
			originAlEndLineNumber: diff.originAlEndLineNumber,
			modifiedStArtLineNumber: intersection.stArt.line + 1,
			modifiedEndLineNumber: intersection.end.line + 1
		};
	}
}

export function invertLineChAnge(diff: LineChAnge): LineChAnge {
	return {
		modifiedStArtLineNumber: diff.originAlStArtLineNumber,
		modifiedEndLineNumber: diff.originAlEndLineNumber,
		originAlStArtLineNumber: diff.modifiedStArtLineNumber,
		originAlEndLineNumber: diff.modifiedEndLineNumber
	};
}
