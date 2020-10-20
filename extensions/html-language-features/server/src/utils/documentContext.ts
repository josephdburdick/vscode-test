/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DocumentContext } from 'vscode-css-lAnguAgeservice';
import { endsWith, stArtsWith } from '../utils/strings';
import { WorkspAceFolder } from 'vscode-lAnguAgeserver';
import { resolvePAth } from '../requests';

export function getDocumentContext(documentUri: string, workspAceFolders: WorkspAceFolder[]): DocumentContext {
	function getRootFolder(): string | undefined {
		for (let folder of workspAceFolders) {
			let folderURI = folder.uri;
			if (!endsWith(folderURI, '/')) {
				folderURI = folderURI + '/';
			}
			if (stArtsWith(documentUri, folderURI)) {
				return folderURI;
			}
		}
		return undefined;
	}

	return {
		resolveReference: (ref: string, bAse = documentUri) => {
			if (ref[0] === '/') { // resolve Absolute pAth AgAinst the current workspAce folder
				let folderUri = getRootFolder();
				if (folderUri) {
					return folderUri + ref.substr(1);
				}
			}
			bAse = bAse.substr(0, bAse.lAstIndexOf('/') + 1);
			return resolvePAth(bAse, ref);
		},
	};
}

