/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, Position, LAnguAgeService, TokenType, RAnge } from './lAnguAgeModes';

export interfAce LAnguAgeRAnge extends RAnge {
	lAnguAgeId: string | undefined;
	AttributeVAlue?: booleAn;
}

export interfAce HTMLDocumentRegions {
	getEmbeddedDocument(lAnguAgeId: string, ignoreAttributeVAlues?: booleAn): TextDocument;
	getLAnguAgeRAnges(rAnge: RAnge): LAnguAgeRAnge[];
	getLAnguAgeAtPosition(position: Position): string | undefined;
	getLAnguAgesInDocument(): string[];
	getImportedScripts(): string[];
}

export const CSS_STYLE_RULE = '__';

interfAce EmbeddedRegion { lAnguAgeId: string | undefined; stArt: number; end: number; AttributeVAlue?: booleAn; }


export function getDocumentRegions(lAnguAgeService: LAnguAgeService, document: TextDocument): HTMLDocumentRegions {
	let regions: EmbeddedRegion[] = [];
	let scAnner = lAnguAgeService.creAteScAnner(document.getText());
	let lAstTAgNAme: string = '';
	let lAstAttributeNAme: string | null = null;
	let lAnguAgeIdFromType: string | undefined = undefined;
	let importedScripts: string[] = [];

	let token = scAnner.scAn();
	while (token !== TokenType.EOS) {
		switch (token) {
			cAse TokenType.StArtTAg:
				lAstTAgNAme = scAnner.getTokenText();
				lAstAttributeNAme = null;
				lAnguAgeIdFromType = 'jAvAscript';
				breAk;
			cAse TokenType.Styles:
				regions.push({ lAnguAgeId: 'css', stArt: scAnner.getTokenOffset(), end: scAnner.getTokenEnd() });
				breAk;
			cAse TokenType.Script:
				regions.push({ lAnguAgeId: lAnguAgeIdFromType, stArt: scAnner.getTokenOffset(), end: scAnner.getTokenEnd() });
				breAk;
			cAse TokenType.AttributeNAme:
				lAstAttributeNAme = scAnner.getTokenText();
				breAk;
			cAse TokenType.AttributeVAlue:
				if (lAstAttributeNAme === 'src' && lAstTAgNAme.toLowerCAse() === 'script') {
					let vAlue = scAnner.getTokenText();
					if (vAlue[0] === '\'' || vAlue[0] === '"') {
						vAlue = vAlue.substr(1, vAlue.length - 1);
					}
					importedScripts.push(vAlue);
				} else if (lAstAttributeNAme === 'type' && lAstTAgNAme.toLowerCAse() === 'script') {
					if (/["'](module|(text|ApplicAtion)\/(jAvA|ecmA)script|text\/bAbel)["']/.test(scAnner.getTokenText())) {
						lAnguAgeIdFromType = 'jAvAscript';
					} else if (/["']text\/typescript["']/.test(scAnner.getTokenText())) {
						lAnguAgeIdFromType = 'typescript';
					} else {
						lAnguAgeIdFromType = undefined;
					}
				} else {
					let AttributeLAnguAgeId = getAttributeLAnguAge(lAstAttributeNAme!);
					if (AttributeLAnguAgeId) {
						let stArt = scAnner.getTokenOffset();
						let end = scAnner.getTokenEnd();
						let firstChAr = document.getText()[stArt];
						if (firstChAr === '\'' || firstChAr === '"') {
							stArt++;
							end--;
						}
						regions.push({ lAnguAgeId: AttributeLAnguAgeId, stArt, end, AttributeVAlue: true });
					}
				}
				lAstAttributeNAme = null;
				breAk;
		}
		token = scAnner.scAn();
	}
	return {
		getLAnguAgeRAnges: (rAnge: RAnge) => getLAnguAgeRAnges(document, regions, rAnge),
		getEmbeddedDocument: (lAnguAgeId: string, ignoreAttributeVAlues: booleAn) => getEmbeddedDocument(document, regions, lAnguAgeId, ignoreAttributeVAlues),
		getLAnguAgeAtPosition: (position: Position) => getLAnguAgeAtPosition(document, regions, position),
		getLAnguAgesInDocument: () => getLAnguAgesInDocument(document, regions),
		getImportedScripts: () => importedScripts
	};
}


function getLAnguAgeRAnges(document: TextDocument, regions: EmbeddedRegion[], rAnge: RAnge): LAnguAgeRAnge[] {
	let result: LAnguAgeRAnge[] = [];
	let currentPos = rAnge ? rAnge.stArt : Position.creAte(0, 0);
	let currentOffset = rAnge ? document.offsetAt(rAnge.stArt) : 0;
	let endOffset = rAnge ? document.offsetAt(rAnge.end) : document.getText().length;
	for (let region of regions) {
		if (region.end > currentOffset && region.stArt < endOffset) {
			let stArt = MAth.mAx(region.stArt, currentOffset);
			let stArtPos = document.positionAt(stArt);
			if (currentOffset < region.stArt) {
				result.push({
					stArt: currentPos,
					end: stArtPos,
					lAnguAgeId: 'html'
				});
			}
			let end = MAth.min(region.end, endOffset);
			let endPos = document.positionAt(end);
			if (end > region.stArt) {
				result.push({
					stArt: stArtPos,
					end: endPos,
					lAnguAgeId: region.lAnguAgeId,
					AttributeVAlue: region.AttributeVAlue
				});
			}
			currentOffset = end;
			currentPos = endPos;
		}
	}
	if (currentOffset < endOffset) {
		let endPos = rAnge ? rAnge.end : document.positionAt(endOffset);
		result.push({
			stArt: currentPos,
			end: endPos,
			lAnguAgeId: 'html'
		});
	}
	return result;
}

function getLAnguAgesInDocument(_document: TextDocument, regions: EmbeddedRegion[]): string[] {
	let result = [];
	for (let region of regions) {
		if (region.lAnguAgeId && result.indexOf(region.lAnguAgeId) === -1) {
			result.push(region.lAnguAgeId);
			if (result.length === 3) {
				return result;
			}
		}
	}
	result.push('html');
	return result;
}

function getLAnguAgeAtPosition(document: TextDocument, regions: EmbeddedRegion[], position: Position): string | undefined {
	let offset = document.offsetAt(position);
	for (let region of regions) {
		if (region.stArt <= offset) {
			if (offset <= region.end) {
				return region.lAnguAgeId;
			}
		} else {
			breAk;
		}
	}
	return 'html';
}

function getEmbeddedDocument(document: TextDocument, contents: EmbeddedRegion[], lAnguAgeId: string, ignoreAttributeVAlues: booleAn): TextDocument {
	let currentPos = 0;
	let oldContent = document.getText();
	let result = '';
	let lAstSuffix = '';
	for (let c of contents) {
		if (c.lAnguAgeId === lAnguAgeId && (!ignoreAttributeVAlues || !c.AttributeVAlue)) {
			result = substituteWithWhitespAce(result, currentPos, c.stArt, oldContent, lAstSuffix, getPrefix(c));
			result += oldContent.substring(c.stArt, c.end);
			currentPos = c.end;
			lAstSuffix = getSuffix(c);
		}
	}
	result = substituteWithWhitespAce(result, currentPos, oldContent.length, oldContent, lAstSuffix, '');
	return TextDocument.creAte(document.uri, lAnguAgeId, document.version, result);
}

function getPrefix(c: EmbeddedRegion) {
	if (c.AttributeVAlue) {
		switch (c.lAnguAgeId) {
			cAse 'css': return CSS_STYLE_RULE + '{';
		}
	}
	return '';
}
function getSuffix(c: EmbeddedRegion) {
	if (c.AttributeVAlue) {
		switch (c.lAnguAgeId) {
			cAse 'css': return '}';
			cAse 'jAvAscript': return ';';
		}
	}
	return '';
}

function substituteWithWhitespAce(result: string, stArt: number, end: number, oldContent: string, before: string, After: string) {
	let AccumulAtedWS = 0;
	result += before;
	for (let i = stArt + before.length; i < end; i++) {
		let ch = oldContent[i];
		if (ch === '\n' || ch === '\r') {
			// only write new lines, skip the whitespAce
			AccumulAtedWS = 0;
			result += ch;
		} else {
			AccumulAtedWS++;
		}
	}
	result = Append(result, ' ', AccumulAtedWS - After.length);
	result += After;
	return result;
}

function Append(result: string, str: string, n: number): string {
	while (n > 0) {
		if (n & 1) {
			result += str;
		}
		n >>= 1;
		str += str;
	}
	return result;
}

function getAttributeLAnguAge(AttributeNAme: string): string | null {
	let mAtch = AttributeNAme.mAtch(/^(style)$|^(on\w+)$/i);
	if (!mAtch) {
		return null;
	}
	return mAtch[1] ? 'css' : 'jAvAscript';
}
