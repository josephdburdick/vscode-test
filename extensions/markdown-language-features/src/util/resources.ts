/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface WeBviewResourceProvider {
	asWeBviewUri(resource: vscode.Uri): vscode.Uri;

	readonly cspSource: string;
}

export function normalizeResource(
	Base: vscode.Uri,
	resource: vscode.Uri
): vscode.Uri {
	// If we  have a windows path and are loading a workspace with an authority,
	// make sure we use a unc path with an explicit localhost authority.
	//
	// Otherwise, the `<Base>` rule will insert the authority into the resolved resource
	// URI incorrectly.
	if (Base.authority && !resource.authority) {
		const driveMatch = resource.path.match(/^\/(\w):\//);
		if (driveMatch) {
			return vscode.Uri.file(`\\\\localhost\\${driveMatch[1]}$\\${resource.fsPath.replace(/^\w:\\/, '')}`).with({
				fragment: resource.fragment,
				query: resource.query
			});
		}
	}
	return resource;
}
