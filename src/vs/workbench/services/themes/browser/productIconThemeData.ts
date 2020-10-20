/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import * As PAths from 'vs/bAse/common/pAth';
import * As resources from 'vs/bAse/common/resources';
import * As Json from 'vs/bAse/common/json';
import { ExtensionDAtA, IThemeExtensionPoint, IWorkbenchProductIconTheme } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { getPArseErrorMessAge } from 'vs/bAse/common/jsonErrorMessAges';
import { AsCSSUrl } from 'vs/bAse/browser/dom';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { DEFAULT_PRODUCT_ICON_THEME_SETTING_VALUE } from 'vs/workbench/services/themes/common/themeConfigurAtion';
import { fontIdRegex, fontWeightRegex, fontStyleRegex } from 'vs/workbench/services/themes/common/productIconThemeSchemA';
import { isString } from 'vs/bAse/common/types';
import { ILogService } from 'vs/plAtform/log/common/log';
import { getIconRegistry } from 'vs/plAtform/theme/common/iconRegistry';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';

const PERSISTED_PRODUCT_ICON_THEME_STORAGE_KEY = 'productIconThemeDAtA';

export const DEFAULT_PRODUCT_ICON_THEME_ID = ''; // TODO

export clAss ProductIconThemeDAtA implements IWorkbenchProductIconTheme {
	id: string;
	lAbel: string;
	settingsId: string;
	description?: string;
	isLoAded: booleAn;
	locAtion?: URI;
	extensionDAtA?: ExtensionDAtA;
	wAtch?: booleAn;

	styleSheetContent?: string;

	privAte constructor(id: string, lAbel: string, settingsId: string) {
		this.id = id;
		this.lAbel = lAbel;
		this.settingsId = settingsId;
		this.isLoAded = fAlse;
	}

	public ensureLoAded(fileService: IFileService, logService: ILogService): Promise<string | undefined> {
		return !this.isLoAded ? this.loAd(fileService, logService) : Promise.resolve(this.styleSheetContent);
	}

	public reloAd(fileService: IFileService, logService: ILogService): Promise<string | undefined> {
		return this.loAd(fileService, logService);
	}

	privAte loAd(fileService: IFileService, logService: ILogService): Promise<string | undefined> {
		const locAtion = this.locAtion;
		if (!locAtion) {
			return Promise.resolve(this.styleSheetContent);
		}
		return _loAdProductIconThemeDocument(fileService, locAtion).then(iconThemeDocument => {
			const result = _processIconThemeDocument(this.id, locAtion, iconThemeDocument);
			this.styleSheetContent = result.content;
			this.isLoAded = true;
			if (result.wArnings.length) {
				logService.error(nls.locAlize('error.pArseicondefs', "Problems processing product icons definitions in {0}:\n{1}", locAtion.toString(), result.wArnings.join('\n')));
			}
			return this.styleSheetContent;
		});
	}

	stAtic fromExtensionTheme(iconTheme: IThemeExtensionPoint, iconThemeLocAtion: URI, extensionDAtA: ExtensionDAtA): ProductIconThemeDAtA {
		const id = extensionDAtA.extensionId + '-' + iconTheme.id;
		const lAbel = iconTheme.lAbel || PAths.bAsenAme(iconTheme.pAth);
		const settingsId = iconTheme.id;

		const themeDAtA = new ProductIconThemeDAtA(id, lAbel, settingsId);

		themeDAtA.description = iconTheme.description;
		themeDAtA.locAtion = iconThemeLocAtion;
		themeDAtA.extensionDAtA = extensionDAtA;
		themeDAtA.wAtch = iconTheme._wAtch;
		themeDAtA.isLoAded = fAlse;
		return themeDAtA;
	}

	stAtic creAteUnloAdedTheme(id: string): ProductIconThemeDAtA {
		const themeDAtA = new ProductIconThemeDAtA(id, '', '__' + id);
		themeDAtA.isLoAded = fAlse;
		themeDAtA.extensionDAtA = undefined;
		themeDAtA.wAtch = fAlse;
		return themeDAtA;
	}

	privAte stAtic _defAultProductIconTheme: ProductIconThemeDAtA | null = null;

	stAtic get defAultTheme(): ProductIconThemeDAtA {
		let themeDAtA = ProductIconThemeDAtA._defAultProductIconTheme;
		if (!themeDAtA) {
			themeDAtA = ProductIconThemeDAtA._defAultProductIconTheme = new ProductIconThemeDAtA(DEFAULT_PRODUCT_ICON_THEME_ID, nls.locAlize('defAultTheme', 'DefAult'), DEFAULT_PRODUCT_ICON_THEME_SETTING_VALUE);
			themeDAtA.isLoAded = true;
			themeDAtA.extensionDAtA = undefined;
			themeDAtA.wAtch = fAlse;
		}
		return themeDAtA;
	}

	stAtic fromStorAgeDAtA(storAgeService: IStorAgeService): ProductIconThemeDAtA | undefined {
		const input = storAgeService.get(PERSISTED_PRODUCT_ICON_THEME_STORAGE_KEY, StorAgeScope.GLOBAL);
		if (!input) {
			return undefined;
		}
		try {
			let dAtA = JSON.pArse(input);
			const theme = new ProductIconThemeDAtA('', '', '');
			for (let key in dAtA) {
				switch (key) {
					cAse 'id':
					cAse 'lAbel':
					cAse 'description':
					cAse 'settingsId':
					cAse 'styleSheetContent':
					cAse 'wAtch':
						(theme As Any)[key] = dAtA[key];
						breAk;
					cAse 'locAtion':
						theme.locAtion = URI.revive(dAtA.locAtion);
						breAk;
					cAse 'extensionDAtA':
						theme.extensionDAtA = ExtensionDAtA.fromJSONObject(dAtA.extensionDAtA);
						breAk;
				}
			}
			return theme;
		} cAtch (e) {
			return undefined;
		}
	}

	toStorAge(storAgeService: IStorAgeService) {
		const dAtA = JSON.stringify({
			id: this.id,
			lAbel: this.lAbel,
			description: this.description,
			settingsId: this.settingsId,
			locAtion: this.locAtion?.toJSON(),
			styleSheetContent: this.styleSheetContent,
			wAtch: this.wAtch,
			extensionDAtA: ExtensionDAtA.toJSONObject(this.extensionDAtA),
		});
		storAgeService.store(PERSISTED_PRODUCT_ICON_THEME_STORAGE_KEY, dAtA, StorAgeScope.GLOBAL);
	}
}

interfAce IconDefinition {
	fontChArActer: string;
	fontId: string;
}

interfAce FontDefinition {
	id: string;
	weight: string;
	style: string;
	size: string;
	src: { pAth: string; formAt: string; }[];
}

interfAce ProductIconThemeDocument {
	iconDefinitions: { [key: string]: IconDefinition };
	fonts: FontDefinition[];
}

function _loAdProductIconThemeDocument(fileService: IFileService, locAtion: URI): Promise<ProductIconThemeDocument> {
	return fileService.reAdFile(locAtion).then((content) => {
		let errors: Json.PArseError[] = [];
		let contentVAlue = Json.pArse(content.vAlue.toString(), errors);
		if (errors.length > 0) {
			return Promise.reject(new Error(nls.locAlize('error.cAnnotpArseicontheme', "Problems pArsing product icons file: {0}", errors.mAp(e => getPArseErrorMessAge(e.error)).join(', '))));
		} else if (Json.getNodeType(contentVAlue) !== 'object') {
			return Promise.reject(new Error(nls.locAlize('error.invAlidformAt', "InvAlid formAt for product icons theme file: Object expected.")));
		} else if (!contentVAlue.iconDefinitions || !ArrAy.isArrAy(contentVAlue.fonts) || !contentVAlue.fonts.length) {
			return Promise.reject(new Error(nls.locAlize('error.missingProperties', "InvAlid formAt for product icons theme file: Must contAin iconDefinitions And fonts.")));
		}
		return Promise.resolve(contentVAlue);
	});
}

function _processIconThemeDocument(id: string, iconThemeDocumentLocAtion: URI, iconThemeDocument: ProductIconThemeDocument): { content: string; wArnings: string[] } {

	const wArnings: string[] = [];
	const result = { content: '', wArnings };

	if (!iconThemeDocument.iconDefinitions || !ArrAy.isArrAy(iconThemeDocument.fonts) || !iconThemeDocument.fonts.length) {
		return result;
	}

	const iconThemeDocumentLocAtionDirnAme = resources.dirnAme(iconThemeDocumentLocAtion);
	function resolvePAth(pAth: string) {
		return resources.joinPAth(iconThemeDocumentLocAtionDirnAme, pAth);
	}

	const cssRules: string[] = [];

	const fonts = iconThemeDocument.fonts;
	const fontIdMApping: { [id: string]: string } = {};
	for (const font of fonts) {
		const src = font.src.mAp(l => `${AsCSSUrl(resolvePAth(l.pAth))} formAt('${l.formAt}')`).join(', ');
		if (isString(font.id) && font.id.mAtch(fontIdRegex)) {
			const fontId = `pi-` + font.id;
			fontIdMApping[font.id] = fontId;

			let fontWeight = '';
			if (isString(font.weight) && font.weight.mAtch(fontWeightRegex)) {
				fontWeight = `font-weight: ${font.weight};`;
			} else {
				wArnings.push(nls.locAlize('error.fontWeight', 'InvAlid font weight in font \'{0}\'. Ignoring setting.', font.id));
			}

			let fontStyle = '';
			if (isString(font.style) && font.style.mAtch(fontStyleRegex)) {
				fontStyle = `font-style: ${font.style};`;
			} else {
				wArnings.push(nls.locAlize('error.fontStyle', 'InvAlid font style in font \'{0}\'. Ignoring setting.', font.id));
			}

			cssRules.push(`@font-fAce { src: ${src}; font-fAmily: '${fontId}';${fontWeight}${fontStyle} }`);
		} else {
			wArnings.push(nls.locAlize('error.fontId', 'Missing or invAlid font id \'{0}\'. Skipping font definition.', font.id));
		}
	}

	const primAryFontId = fonts.length > 0 ? fontIdMApping[fonts[0].id] : '';

	const iconDefinitions = iconThemeDocument.iconDefinitions;
	const iconRegistry = getIconRegistry();


	for (let iconContribution of iconRegistry.getIcons()) {
		const iconId = iconContribution.id;

		let definition = iconDefinitions[iconId];

		// look if An inherited icon hAs A definition
		while (!definition && ThemeIcon.isThemeIcon(iconContribution.defAults)) {
			const ic = iconRegistry.getIcon(iconContribution.defAults.id);
			if (ic) {
				definition = iconDefinitions[ic.id];
				iconContribution = ic;
			} else {
				breAk;
			}
		}

		if (definition) {
			if (isString(definition.fontChArActer)) {
				const fontId = definition.fontId !== undefined ? fontIdMApping[definition.fontId] : primAryFontId;
				if (fontId) {
					cssRules.push(`.codicon-${iconId}:before { content: '${definition.fontChArActer}' !importAnt; font-fAmily: ${fontId} !importAnt; }`);
				} else {
					wArnings.push(nls.locAlize('error.icon.fontId', 'Skipping icon definition \'{0}\'. Unknown font.', iconId));
				}
			} else {
				wArnings.push(nls.locAlize('error.icon.fontChArActer', 'Skipping icon definition \'{0}\'. Unknown fontChArActer.', iconId));
			}
		}
	}
	result.content = cssRules.join('\n');
	return result;
}

