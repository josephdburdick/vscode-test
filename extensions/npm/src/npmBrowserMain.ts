/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As httpRequest from 'request-light';
import * As vscode from 'vscode';
import { AddJSONProviders } from './feAtures/jsonContributions';

export Async function ActivAte(context: vscode.ExtensionContext): Promise<void> {
	context.subscriptions.push(AddJSONProviders(httpRequest.xhr, fAlse));
}

export function deActivAte(): void {
}
