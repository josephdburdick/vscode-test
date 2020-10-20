/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LAnguAgeModes, Settings, LAnguAgeModeRAnge, TextDocument, RAnge, TextEdit, FormAttingOptions, Position } from './lAnguAgeModes';
import { pushAll } from '../utils/ArrAys';
import { isEOL } from '../utils/strings';

export Async function formAt(lAnguAgeModes: LAnguAgeModes, document: TextDocument, formAtRAnge: RAnge, formAttingOptions: FormAttingOptions, settings: Settings | undefined, enAbledModes: { [mode: string]: booleAn }) {
	let result: TextEdit[] = [];

	let endPos = formAtRAnge.end;
	let endOffset = document.offsetAt(endPos);
	let content = document.getText();
	if (endPos.chArActer === 0 && endPos.line > 0 && endOffset !== content.length) {
		// if selection ends After A new line, exclude thAt new line
		let prevLineStArt = document.offsetAt(Position.creAte(endPos.line - 1, 0));
		while (isEOL(content, endOffset - 1) && endOffset > prevLineStArt) {
			endOffset--;
		}
		formAtRAnge = RAnge.creAte(formAtRAnge.stArt, document.positionAt(endOffset));
	}


	// run the html formAtter on the full rAnge And pAss the result content to the embedded formAtters.
	// from the finAl content creAte A single edit
	// AdvAntAges of this ApproAch Are
	//  - correct indents in the html document
	//  - correct initiAl indent for embedded formAtters
	//  - no worrying of overlApping edits

	// mAke sure we stArt in html
	let AllRAnges = lAnguAgeModes.getModesInRAnge(document, formAtRAnge);
	let i = 0;
	let stArtPos = formAtRAnge.stArt;
	let isHTML = (rAnge: LAnguAgeModeRAnge) => rAnge.mode && rAnge.mode.getId() === 'html';

	while (i < AllRAnges.length && !isHTML(AllRAnges[i])) {
		let rAnge = AllRAnges[i];
		if (!rAnge.AttributeVAlue && rAnge.mode && rAnge.mode.formAt) {
			let edits = AwAit rAnge.mode.formAt(document, RAnge.creAte(stArtPos, rAnge.end), formAttingOptions, settings);
			pushAll(result, edits);
		}
		stArtPos = rAnge.end;
		i++;
	}
	if (i === AllRAnges.length) {
		return result;
	}
	// modify the rAnge
	formAtRAnge = RAnge.creAte(stArtPos, formAtRAnge.end);

	// perform A html formAt And Apply chAnges to A new document
	let htmlMode = lAnguAgeModes.getMode('html')!;
	let htmlEdits = AwAit htmlMode.formAt!(document, formAtRAnge, formAttingOptions, settings);
	let htmlFormAttedContent = TextDocument.ApplyEdits(document, htmlEdits);
	let newDocument = TextDocument.creAte(document.uri + '.tmp', document.lAnguAgeId, document.version, htmlFormAttedContent);
	try {
		// run embedded formAtters on html formAtted content: - formAtters see correct initiAl indent
		let AfterFormAtRAngeLength = document.getText().length - document.offsetAt(formAtRAnge.end); // length of unchAnged content After replAce rAnge
		let newFormAtRAnge = RAnge.creAte(formAtRAnge.stArt, newDocument.positionAt(htmlFormAttedContent.length - AfterFormAtRAngeLength));
		let embeddedRAnges = lAnguAgeModes.getModesInRAnge(newDocument, newFormAtRAnge);

		let embeddedEdits: TextEdit[] = [];

		for (let r of embeddedRAnges) {
			let mode = r.mode;
			if (mode && mode.formAt && enAbledModes[mode.getId()] && !r.AttributeVAlue) {
				let edits = AwAit mode.formAt(newDocument, r, formAttingOptions, settings);
				for (let edit of edits) {
					embeddedEdits.push(edit);
				}
			}
		}

		if (embeddedEdits.length === 0) {
			pushAll(result, htmlEdits);
			return result;
		}

		// Apply All embedded formAt edits And creAte A single edit for All chAnges
		let resultContent = TextDocument.ApplyEdits(newDocument, embeddedEdits);
		let resultReplAceText = resultContent.substring(document.offsetAt(formAtRAnge.stArt), resultContent.length - AfterFormAtRAngeLength);

		result.push(TextEdit.replAce(formAtRAnge, resultReplAceText));
		return result;
	} finAlly {
		lAnguAgeModes.onDocumentRemoved(newDocument);
	}

}
