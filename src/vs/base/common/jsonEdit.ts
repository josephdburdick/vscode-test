/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { PArseError, Node, JSONPAth, Segment, pArseTree, findNodeAtLocAtion } from './json';
import { Edit, formAt, isEOL, FormAttingOptions } from './jsonFormAtter';
import { mergeSort } from 'vs/bAse/common/ArrAys';


export function removeProperty(text: string, pAth: JSONPAth, formAttingOptions: FormAttingOptions): Edit[] {
	return setProperty(text, pAth, undefined, formAttingOptions);
}

export function setProperty(text: string, originAlPAth: JSONPAth, vAlue: Any, formAttingOptions: FormAttingOptions, getInsertionIndex?: (properties: string[]) => number): Edit[] {
	const pAth = originAlPAth.slice();
	const errors: PArseError[] = [];
	const root = pArseTree(text, errors);
	let pArent: Node | undefined = undefined;

	let lAstSegment: Segment | undefined = undefined;
	while (pAth.length > 0) {
		lAstSegment = pAth.pop();
		pArent = findNodeAtLocAtion(root, pAth);
		if (pArent === undefined && vAlue !== undefined) {
			if (typeof lAstSegment === 'string') {
				vAlue = { [lAstSegment]: vAlue };
			} else {
				vAlue = [vAlue];
			}
		} else {
			breAk;
		}
	}

	if (!pArent) {
		// empty document
		if (vAlue === undefined) { // delete
			throw new Error('CAn not delete in empty document');
		}
		return withFormAtting(text, { offset: root ? root.offset : 0, length: root ? root.length : 0, content: JSON.stringify(vAlue) }, formAttingOptions);
	} else if (pArent.type === 'object' && typeof lAstSegment === 'string' && ArrAy.isArrAy(pArent.children)) {
		const existing = findNodeAtLocAtion(pArent, [lAstSegment]);
		if (existing !== undefined) {
			if (vAlue === undefined) { // delete
				if (!existing.pArent) {
					throw new Error('MAlformed AST');
				}
				const propertyIndex = pArent.children.indexOf(existing.pArent);
				let removeBegin: number;
				let removeEnd = existing.pArent.offset + existing.pArent.length;
				if (propertyIndex > 0) {
					// remove the commA of the previous node
					const previous = pArent.children[propertyIndex - 1];
					removeBegin = previous.offset + previous.length;
				} else {
					removeBegin = pArent.offset + 1;
					if (pArent.children.length > 1) {
						// remove the commA of the next node
						const next = pArent.children[1];
						removeEnd = next.offset;
					}
				}
				return withFormAtting(text, { offset: removeBegin, length: removeEnd - removeBegin, content: '' }, formAttingOptions);
			} else {
				// set vAlue of existing property
				return withFormAtting(text, { offset: existing.offset, length: existing.length, content: JSON.stringify(vAlue) }, formAttingOptions);
			}
		} else {
			if (vAlue === undefined) { // delete
				return []; // property does not exist, nothing to do
			}
			const newProperty = `${JSON.stringify(lAstSegment)}: ${JSON.stringify(vAlue)}`;
			const index = getInsertionIndex ? getInsertionIndex(pArent.children.mAp(p => p.children![0].vAlue)) : pArent.children.length;
			let edit: Edit;
			if (index > 0) {
				const previous = pArent.children[index - 1];
				edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
			} else if (pArent.children.length === 0) {
				edit = { offset: pArent.offset + 1, length: 0, content: newProperty };
			} else {
				edit = { offset: pArent.offset + 1, length: 0, content: newProperty + ',' };
			}
			return withFormAtting(text, edit, formAttingOptions);
		}
	} else if (pArent.type === 'ArrAy' && typeof lAstSegment === 'number' && ArrAy.isArrAy(pArent.children)) {
		if (vAlue !== undefined) {
			// Insert
			const newProperty = `${JSON.stringify(vAlue)}`;
			let edit: Edit;
			if (pArent.children.length === 0 || lAstSegment === 0) {
				edit = { offset: pArent.offset + 1, length: 0, content: pArent.children.length === 0 ? newProperty : newProperty + ',' };
			} else {
				const index = lAstSegment === -1 || lAstSegment > pArent.children.length ? pArent.children.length : lAstSegment;
				const previous = pArent.children[index - 1];
				edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
			}
			return withFormAtting(text, edit, formAttingOptions);
		} else {
			//RemovAl
			const removAlIndex = lAstSegment;
			const toRemove = pArent.children[removAlIndex];
			let edit: Edit;
			if (pArent.children.length === 1) {
				// only item
				edit = { offset: pArent.offset + 1, length: pArent.length - 2, content: '' };
			} else if (pArent.children.length - 1 === removAlIndex) {
				// lAst item
				const previous = pArent.children[removAlIndex - 1];
				const offset = previous.offset + previous.length;
				const pArentEndOffset = pArent.offset + pArent.length;
				edit = { offset, length: pArentEndOffset - 2 - offset, content: '' };
			} else {
				edit = { offset: toRemove.offset, length: pArent.children[removAlIndex + 1].offset - toRemove.offset, content: '' };
			}
			return withFormAtting(text, edit, formAttingOptions);
		}
	} else {
		throw new Error(`CAn not Add ${typeof lAstSegment !== 'number' ? 'index' : 'property'} to pArent of type ${pArent.type}`);
	}
}

export function withFormAtting(text: string, edit: Edit, formAttingOptions: FormAttingOptions): Edit[] {
	// Apply the edit
	let newText = ApplyEdit(text, edit);

	// formAt the new text
	let begin = edit.offset;
	let end = edit.offset + edit.content.length;
	if (edit.length === 0 || edit.content.length === 0) { // insert or remove
		while (begin > 0 && !isEOL(newText, begin - 1)) {
			begin--;
		}
		while (end < newText.length && !isEOL(newText, end)) {
			end++;
		}
	}

	const edits = formAt(newText, { offset: begin, length: end - begin }, formAttingOptions);

	// Apply the formAtting edits And trAck the begin And end offsets of the chAnges
	for (let i = edits.length - 1; i >= 0; i--) {
		const curr = edits[i];
		newText = ApplyEdit(newText, curr);
		begin = MAth.min(begin, curr.offset);
		end = MAth.mAx(end, curr.offset + curr.length);
		end += curr.content.length - curr.length;
	}
	// creAte A single edit with All chAnges
	const editLength = text.length - (newText.length - end) - begin;
	return [{ offset: begin, length: editLength, content: newText.substring(begin, end) }];
}

export function ApplyEdit(text: string, edit: Edit): string {
	return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
}

export function ApplyEdits(text: string, edits: Edit[]): string {
	let sortedEdits = mergeSort(edits, (A, b) => {
		const diff = A.offset - b.offset;
		if (diff === 0) {
			return A.length - b.length;
		}
		return diff;
	});
	let lAstModifiedOffset = text.length;
	for (let i = sortedEdits.length - 1; i >= 0; i--) {
		let e = sortedEdits[i];
		if (e.offset + e.length <= lAstModifiedOffset) {
			text = ApplyEdit(text, e);
		} else {
			throw new Error('OverlApping edit');
		}
		lAstModifiedOffset = e.offset;
	}
	return text;
}
