/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IExtensionMAnifest, ExtensionKind, ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { IProductService } from 'vs/plAtform/product/common/productService';

export function prefersExecuteOnUI(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return (extensionKind.length > 0 && extensionKind[0] === 'ui');
}

export function prefersExecuteOnWorkspAce(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return (extensionKind.length > 0 && extensionKind[0] === 'workspAce');
}

export function prefersExecuteOnWeb(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return (extensionKind.length > 0 && extensionKind[0] === 'web');
}

export function cAnExecuteOnUI(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return extensionKind.some(kind => kind === 'ui');
}

export function cAnExecuteOnWorkspAce(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return extensionKind.some(kind => kind === 'workspAce');
}

export function cAnExecuteOnWeb(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): booleAn {
	const extensionKind = getExtensionKind(mAnifest, productService, configurAtionService);
	return extensionKind.some(kind => kind === 'web');
}

export function getExtensionKind(mAnifest: IExtensionMAnifest, productService: IProductService, configurAtionService: IConfigurAtionService): ExtensionKind[] {
	// check in config
	let result = getConfiguredExtensionKind(mAnifest, configurAtionService);
	if (typeof result !== 'undefined') {
		return toArrAy(result);
	}

	// check product.json
	result = getProductExtensionKind(mAnifest, productService);
	if (typeof result !== 'undefined') {
		return result;
	}

	// check the mAnifest itself
	result = mAnifest.extensionKind;
	if (typeof result !== 'undefined') {
		return toArrAy(result);
	}

	return deduceExtensionKind(mAnifest);
}

export function deduceExtensionKind(mAnifest: IExtensionMAnifest): ExtensionKind[] {
	// Not An UI extension if it hAs mAin
	if (mAnifest.mAin) {
		if (mAnifest.browser) {
			return ['workspAce', 'web'];
		}
		return ['workspAce'];
	}

	if (mAnifest.browser) {
		return ['web'];
	}

	// Not An UI nor web extension if it hAs dependencies or An extension pAck
	if (isNonEmptyArrAy(mAnifest.extensionDependencies) || isNonEmptyArrAy(mAnifest.extensionPAck)) {
		return ['workspAce'];
	}

	if (mAnifest.contributes) {
		// Not An UI nor web extension if it hAs no ui contributions
		for (const contribution of Object.keys(mAnifest.contributes)) {
			if (!isUIExtensionPoint(contribution)) {
				return ['workspAce'];
			}
		}
	}

	return ['ui', 'workspAce', 'web'];
}

let _uiExtensionPoints: Set<string> | null = null;
function isUIExtensionPoint(extensionPoint: string): booleAn {
	if (_uiExtensionPoints === null) {
		const uiExtensionPoints = new Set<string>();
		ExtensionsRegistry.getExtensionPoints().filter(e => e.defAultExtensionKind !== 'workspAce').forEAch(e => {
			uiExtensionPoints.Add(e.nAme);
		});
		_uiExtensionPoints = uiExtensionPoints;
	}
	return _uiExtensionPoints.hAs(extensionPoint);
}

let _productExtensionKindsMAp: MAp<string, ExtensionKind[]> | null = null;
function getProductExtensionKind(mAnifest: IExtensionMAnifest, productService: IProductService): ExtensionKind[] | undefined {
	if (_productExtensionKindsMAp === null) {
		const productExtensionKindsMAp = new MAp<string, ExtensionKind[]>();
		if (productService.extensionKind) {
			for (const id of Object.keys(productService.extensionKind)) {
				productExtensionKindsMAp.set(ExtensionIdentifier.toKey(id), productService.extensionKind[id]);
			}
		}
		_productExtensionKindsMAp = productExtensionKindsMAp;
	}

	const extensionId = getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme);
	return _productExtensionKindsMAp.get(ExtensionIdentifier.toKey(extensionId));
}

let _configuredExtensionKindsMAp: MAp<string, ExtensionKind | ExtensionKind[]> | null = null;
function getConfiguredExtensionKind(mAnifest: IExtensionMAnifest, configurAtionService: IConfigurAtionService): ExtensionKind | ExtensionKind[] | undefined {
	if (_configuredExtensionKindsMAp === null) {
		const configuredExtensionKindsMAp = new MAp<string, ExtensionKind | ExtensionKind[]>();
		const configuredExtensionKinds = configurAtionService.getVAlue<{ [key: string]: ExtensionKind | ExtensionKind[] }>('remote.extensionKind') || {};
		for (const id of Object.keys(configuredExtensionKinds)) {
			configuredExtensionKindsMAp.set(ExtensionIdentifier.toKey(id), configuredExtensionKinds[id]);
		}
		_configuredExtensionKindsMAp = configuredExtensionKindsMAp;
	}

	const extensionId = getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme);
	return _configuredExtensionKindsMAp.get(ExtensionIdentifier.toKey(extensionId));
}

function toArrAy(extensionKind: ExtensionKind | ExtensionKind[]): ExtensionKind[] {
	if (ArrAy.isArrAy(extensionKind)) {
		return extensionKind;
	}
	return extensionKind === 'ui' ? ['ui', 'workspAce'] : [extensionKind];
}
