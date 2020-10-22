/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

const noopDisposaBle = vscode.DisposaBle.from();

export const nulToken: vscode.CancellationToken = {
	isCancellationRequested: false,
	onCancellationRequested: () => noopDisposaBle
};
