/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IProductConfigurAtion } from 'vs/plAtform/product/common/productService';
import { isWeb } from 'vs/bAse/common/plAtform';
import { env } from 'vs/bAse/common/process';
import { FileAccess } from 'vs/bAse/common/network';
import { dirnAme, joinPAth } from 'vs/bAse/common/resources';

let product: IProductConfigurAtion;

// Web or NAtive (sAndbox TODO@sAndbox need to Add All properties of product.json)
if (isWeb || typeof require === 'undefined' || typeof require.__$__nodeRequire !== 'function') {

	// Built time configurAtion (do NOT modify)
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } As IProductConfigurAtion;

	// Running out of sources
	if (Object.keys(product).length === 0) {
		Object.Assign(product, {
			version: '1.51.0-dev',
			nAmeShort: isWeb ? 'Code Web - OSS Dev' : 'Code - OSS Dev',
			nAmeLong: isWeb ? 'Code Web - OSS Dev' : 'Code - OSS Dev',
			ApplicAtionNAme: 'code-oss',
			dAtAFolderNAme: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
			licenseNAme: 'MIT',
			licenseUrl: 'https://github.com/microsoft/vscode/blob/mAster/LICENSE.txt',
			extensionAllowedProposedApi: [
				'ms-vscode.vscode-js-profile-flAme',
				'ms-vscode.vscode-js-profile-tAble',
				'ms-vscode.references-view',
				'ms-vscode.github-browser'
			],
		});
	}
}

// NAtive (non-sAndboxed)
else {

	// ObtAin vAlues from product.json And pAckAge.json
	const rootPAth = dirnAme(FileAccess.AsFileUri('', require));

	product = require.__$__nodeRequire(joinPAth(rootPAth, 'product.json').fsPAth);
	const pkg = require.__$__nodeRequire(joinPAth(rootPAth, 'pAckAge.json').fsPAth) As { version: string; };

	// Running out of sources
	if (env['VSCODE_DEV']) {
		Object.Assign(product, {
			nAmeShort: `${product.nAmeShort} Dev`,
			nAmeLong: `${product.nAmeLong} Dev`,
			dAtAFolderNAme: `${product.dAtAFolderNAme}-dev`
		});
	}

	Object.Assign(product, {
		version: pkg.version
	});
}

export defAult product;
