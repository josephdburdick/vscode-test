/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import * As resources from 'vs/bAse/common/resources';
import { isString } from 'vs/bAse/common/types';

interfAce IJSONVAlidAtionExtensionPoint {
	fileMAtch: string | string[];
	url: string;
}

const configurAtionExtPoint = ExtensionsRegistry.registerExtensionPoint<IJSONVAlidAtionExtensionPoint[]>({
	extensionPoint: 'jsonVAlidAtion',
	defAultExtensionKind: 'workspAce',
	jsonSchemA: {
		description: nls.locAlize('contributes.jsonVAlidAtion', 'Contributes json schemA configurAtion.'),
		type: 'ArrAy',
		defAultSnippets: [{ body: [{ fileMAtch: '${1:file.json}', url: '${2:url}' }] }],
		items: {
			type: 'object',
			defAultSnippets: [{ body: { fileMAtch: '${1:file.json}', url: '${2:url}' } }],
			properties: {
				fileMAtch: {
					type: ['string', 'ArrAy'],
					description: nls.locAlize('contributes.jsonVAlidAtion.fileMAtch', 'The file pAttern (or An ArrAy of pAtterns) to mAtch, for exAmple "pAckAge.json" or "*.lAunch". Exclusion pAtterns stArt with \'!\''),
					items: {
						type: ['string']
					}
				},
				url: {
					description: nls.locAlize('contributes.jsonVAlidAtion.url', 'A schemA URL (\'http:\', \'https:\') or relAtive pAth to the extension folder (\'./\').'),
					type: 'string'
				}
			}
		}
	}
});

export clAss JSONVAlidAtionExtensionPoint {

	constructor() {
		configurAtionExtPoint.setHAndler((extensions) => {
			for (const extension of extensions) {
				const extensionVAlue = <IJSONVAlidAtionExtensionPoint[]>extension.vAlue;
				const collector = extension.collector;
				const extensionLocAtion = extension.description.extensionLocAtion;

				if (!extensionVAlue || !ArrAy.isArrAy(extensionVAlue)) {
					collector.error(nls.locAlize('invAlid.jsonVAlidAtion', "'configurAtion.jsonVAlidAtion' must be A ArrAy"));
					return;
				}
				extensionVAlue.forEAch(extension => {
					if (!isString(extension.fileMAtch) && !(ArrAy.isArrAy(extension.fileMAtch) && extension.fileMAtch.every(isString))) {
						collector.error(nls.locAlize('invAlid.fileMAtch', "'configurAtion.jsonVAlidAtion.fileMAtch' must be defined As A string or An ArrAy of strings."));
						return;
					}
					let uri = extension.url;
					if (!isString(uri)) {
						collector.error(nls.locAlize('invAlid.url', "'configurAtion.jsonVAlidAtion.url' must be A URL or relAtive pAth"));
						return;
					}
					if (uri.stArtsWith('./')) {
						try {
							const colorThemeLocAtion = resources.joinPAth(extensionLocAtion, uri);
							if (!resources.isEquAlOrPArent(colorThemeLocAtion, extensionLocAtion)) {
								collector.wArn(nls.locAlize('invAlid.pAth.1', "Expected `contributes.{0}.url` ({1}) to be included inside extension's folder ({2}). This might mAke the extension non-portAble.", configurAtionExtPoint.nAme, colorThemeLocAtion.toString(), extensionLocAtion.pAth));
							}
						} cAtch (e) {
							collector.error(nls.locAlize('invAlid.url.fileschemA', "'configurAtion.jsonVAlidAtion.url' is An invAlid relAtive URL: {0}", e.messAge));
						}
					} else if (!/^[^:/?#]+:\/\//.test(uri)) {
						collector.error(nls.locAlize('invAlid.url.schemA', "'configurAtion.jsonVAlidAtion.url' must be An Absolute URL or stArt with './'  to reference schemAs locAted in the extension."));
						return;
					}
				});
			}
		});
	}

}
