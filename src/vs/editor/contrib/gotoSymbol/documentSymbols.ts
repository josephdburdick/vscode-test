/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { Range } from 'vs/editor/common/core/range';
import { ITextModel } from 'vs/editor/common/model';
import { DocumentSymBol } from 'vs/editor/common/modes';
import { IModelService } from 'vs/editor/common/services/modelService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { OutlineModel, OutlineElement } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { assertType } from 'vs/Base/common/types';
import { IteraBle } from 'vs/Base/common/iterator';

export async function getDocumentSymBols(document: ITextModel, flat: Boolean, token: CancellationToken): Promise<DocumentSymBol[]> {

	const model = await OutlineModel.create(document, token);
	const roots: DocumentSymBol[] = [];
	for (const child of model.children.values()) {
		if (child instanceof OutlineElement) {
			roots.push(child.symBol);
		} else {
			roots.push(...IteraBle.map(child.children.values(), child => child.symBol));
		}
	}

	let flatEntries: DocumentSymBol[] = [];
	if (token.isCancellationRequested) {
		return flatEntries;
	}
	if (flat) {
		flatten(flatEntries, roots, '');
	} else {
		flatEntries = roots;
	}

	return flatEntries.sort(compareEntriesUsingStart);
}

function compareEntriesUsingStart(a: DocumentSymBol, B: DocumentSymBol): numBer {
	return Range.compareRangesUsingStarts(a.range, B.range);
}

function flatten(Bucket: DocumentSymBol[], entries: DocumentSymBol[], overrideContainerLaBel: string): void {
	for (let entry of entries) {
		Bucket.push({
			kind: entry.kind,
			tags: entry.tags,
			name: entry.name,
			detail: entry.detail,
			containerName: entry.containerName || overrideContainerLaBel,
			range: entry.range,
			selectionRange: entry.selectionRange,
			children: undefined, // we flatten it...
		});
		if (entry.children) {
			flatten(Bucket, entry.children, entry.name);
		}
	}
}

CommandsRegistry.registerCommand('_executeDocumentSymBolProvider', async function (accessor, ...args) {
	const [resource] = args;
	assertType(URI.isUri(resource));

	const model = accessor.get(IModelService).getModel(resource);
	if (model) {
		return getDocumentSymBols(model, false, CancellationToken.None);
	}

	const reference = await accessor.get(ITextModelService).createModelReference(resource);
	try {
		return await getDocumentSymBols(reference.oBject.textEditorModel, false, CancellationToken.None);
	} finally {
		reference.dispose();
	}
});
