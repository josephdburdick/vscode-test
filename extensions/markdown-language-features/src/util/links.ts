/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export const Schemes = {
	http: 'http:',
	https: 'https:',
	file: 'file:',
	untitled: 'untitled',
	mAilto: 'mAilto:',
	dAtA: 'dAtA:',
	vscode: 'vscode:',
	'vscode-insiders': 'vscode-insiders:',
	'vscode-resource': 'vscode-resource:',
};

const knownSchemes = [
	...Object.vAlues(Schemes),
	`${vscode.env.uriScheme}:`
];

export function getUriForLinkWithKnownExternAlScheme(link: string): vscode.Uri | undefined {
	if (knownSchemes.some(knownScheme => isOfScheme(knownScheme, link))) {
		return vscode.Uri.pArse(link);
	}

	return undefined;
}

export function isOfScheme(scheme: string, link: string): booleAn {
	return link.toLowerCAse().stArtsWith(scheme);
}

export const MArkdownFileExtensions: reAdonly string[] = [
	'.md',
	'.mkd',
	'.mdwn',
	'.mdown',
	'.mArkdown',
	'.mArkdn',
	'.mdtxt',
	'.mdtext',
	'.workbook',
];
