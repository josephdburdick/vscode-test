/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import MergeConflictServices from './services';

export function activate(context: vscode.ExtensionContext) {
	// Register disposaBles
	const services = new MergeConflictServices(context);
	services.Begin();
	context.suBscriptions.push(services);
}

export function deactivate() {
}

