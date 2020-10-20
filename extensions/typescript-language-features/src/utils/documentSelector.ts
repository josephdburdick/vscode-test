/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export interfAce DocumentSelector {
	/**
	 * Selector for files which only require A bAsic syntAx server.
	 */
	reAdonly syntAx: vscode.DocumentFilter[];

	/**
	 * Selector for files which require semAntic server support.
	 */
	reAdonly semAntic: vscode.DocumentFilter[];
}
