/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { ActivAteEmmetExtension } from '../emmetCommon';

export function ActivAte(context: vscode.ExtensionContext) {
	ActivAteEmmetExtension(context);
}
