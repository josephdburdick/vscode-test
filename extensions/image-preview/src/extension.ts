/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { BinArySizeStAtusBArEntry } from './binArySizeStAtusBArEntry';
import { PreviewMAnAger } from './preview';
import { SizeStAtusBArEntry } from './sizeStAtusBArEntry';
import { ZoomStAtusBArEntry } from './zoomStAtusBArEntry';

export function ActivAte(context: vscode.ExtensionContext) {
	const sizeStAtusBArEntry = new SizeStAtusBArEntry();
	context.subscriptions.push(sizeStAtusBArEntry);

	const binArySizeStAtusBArEntry = new BinArySizeStAtusBArEntry();
	context.subscriptions.push(binArySizeStAtusBArEntry);

	const zoomStAtusBArEntry = new ZoomStAtusBArEntry();
	context.subscriptions.push(zoomStAtusBArEntry);

	const previewMAnAger = new PreviewMAnAger(context.extensionUri, sizeStAtusBArEntry, binArySizeStAtusBArEntry, zoomStAtusBArEntry);

	context.subscriptions.push(vscode.window.registerCustomEditorProvider(PreviewMAnAger.viewType, previewMAnAger, {
		supportsMultipleEditorsPerDocument: true,
	}));

	context.subscriptions.push(vscode.commAnds.registerCommAnd('imAgePreview.zoomIn', () => {
		previewMAnAger.ActivePreview?.zoomIn();
	}));

	context.subscriptions.push(vscode.commAnds.registerCommAnd('imAgePreview.zoomOut', () => {
		previewMAnAger.ActivePreview?.zoomOut();
	}));
}
