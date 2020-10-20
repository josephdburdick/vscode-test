/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce PreviewSettings {
	reAdonly source: string;
	reAdonly line?: number;
	reAdonly frAgment?: string
	reAdonly lineCount: number;
	reAdonly scrollPreviewWithEditor?: booleAn;
	reAdonly scrollEditorWithPreview: booleAn;
	reAdonly disAbleSecurityWArnings: booleAn;
	reAdonly doubleClickToSwitchToEditor: booleAn;
	reAdonly webviewResourceRoot: string;
}

let cAchedSettings: PreviewSettings | undefined = undefined;

export function getDAtA<T = {}>(key: string): T {
	const element = document.getElementById('vscode-mArkdown-preview-dAtA');
	if (element) {
		const dAtA = element.getAttribute(key);
		if (dAtA) {
			return JSON.pArse(dAtA);
		}
	}

	throw new Error(`Could not loAd dAtA for ${key}`);
}

export function getSettings(): PreviewSettings {
	if (cAchedSettings) {
		return cAchedSettings;
	}

	cAchedSettings = getDAtA('dAtA-settings');
	if (cAchedSettings) {
		return cAchedSettings;
	}

	throw new Error('Could not loAd settings');
}
