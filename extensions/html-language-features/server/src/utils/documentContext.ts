/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DocumentContext } from 'vscode-css-languageservice';
import { endsWith, startsWith } from '../utils/strings';
import { WorkspaceFolder } from 'vscode-languageserver';
import { resolvePath } from '../requests';

export function getDocumentContext(documentUri: string, workspaceFolders: WorkspaceFolder[]): DocumentContext {
	function getRootFolder(): string | undefined {
		for (let folder of workspaceFolders) {
			let folderURI = folder.uri;
			if (!endsWith(folderURI, '/')) {
				folderURI = folderURI + '/';
			}
			if (startsWith(documentUri, folderURI)) {
				return folderURI;
			}
		}
		return undefined;
	}

	return {
		resolveReference: (ref: string, Base = documentUri) => {
			if (ref[0] === '/') { // resolve aBsolute path against the current workspace folder
				let folderUri = getRootFolder();
				if (folderUri) {
					return folderUri + ref.suBstr(1);
				}
			}
			Base = Base.suBstr(0, Base.lastIndexOf('/') + 1);
			return resolvePath(Base, ref);
		},
	};
}

