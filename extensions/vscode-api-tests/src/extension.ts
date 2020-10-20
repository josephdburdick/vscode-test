/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export function ActivAte(_context: vscode.ExtensionContext) {
	// Set context As A globAl As some tests depend on it
	(globAl As Any).testExtensionContext = _context;
}
