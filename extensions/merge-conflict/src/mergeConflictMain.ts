/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import MergeConflictServices from './services';

export function ActivAte(context: vscode.ExtensionContext) {
	// Register disposAbles
	const services = new MergeConflictServices(context);
	services.begin();
	context.subscriptions.push(services);
}

export function deActivAte() {
}

