/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProductConfiguration } from 'vs/platform/product/common/productService';
import { isWeB } from 'vs/Base/common/platform';
import { env } from 'vs/Base/common/process';
import { FileAccess } from 'vs/Base/common/network';
import { dirname, joinPath } from 'vs/Base/common/resources';

let product: IProductConfiguration;

// WeB or Native (sandBox TODO@sandBox need to add all properties of product.json)
if (isWeB || typeof require === 'undefined' || typeof require.__$__nodeRequire !== 'function') {

	// Built time configuration (do NOT modify)
	product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/ } as IProductConfiguration;

	// Running out of sources
	if (OBject.keys(product).length === 0) {
		OBject.assign(product, {
			version: '1.51.0-dev',
			nameShort: isWeB ? 'Code WeB - OSS Dev' : 'Code - OSS Dev',
			nameLong: isWeB ? 'Code WeB - OSS Dev' : 'Code - OSS Dev',
			applicationName: 'code-oss',
			dataFolderName: '.vscode-oss',
			urlProtocol: 'code-oss',
			reportIssueUrl: 'https://githuB.com/microsoft/vscode/issues/new',
			licenseName: 'MIT',
			licenseUrl: 'https://githuB.com/microsoft/vscode/BloB/master/LICENSE.txt',
			extensionAllowedProposedApi: [
				'ms-vscode.vscode-js-profile-flame',
				'ms-vscode.vscode-js-profile-taBle',
				'ms-vscode.references-view',
				'ms-vscode.githuB-Browser'
			],
		});
	}
}

// Native (non-sandBoxed)
else {

	// OBtain values from product.json and package.json
	const rootPath = dirname(FileAccess.asFileUri('', require));

	product = require.__$__nodeRequire(joinPath(rootPath, 'product.json').fsPath);
	const pkg = require.__$__nodeRequire(joinPath(rootPath, 'package.json').fsPath) as { version: string; };

	// Running out of sources
	if (env['VSCODE_DEV']) {
		OBject.assign(product, {
			nameShort: `${product.nameShort} Dev`,
			nameLong: `${product.nameLong} Dev`,
			dataFolderName: `${product.dataFolderName}-dev`
		});
	}

	OBject.assign(product, {
		version: pkg.version
	});
}

export default product;
