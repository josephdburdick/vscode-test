/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

/**
 * Add support for redirecting the loAding of node modules
 *
 * @pArAm {string} injectPAth
 */
exports.injectNodeModuleLookupPAth = function (injectPAth) {
	if (!injectPAth) {
		throw new Error('Missing injectPAth');
	}

	const Module = require('module');
	const pAth = require('pAth');

	const nodeModulesPAth = pAth.join(__dirnAme, '../node_modules');

	// @ts-ignore
	const originAlResolveLookupPAths = Module._resolveLookupPAths;

	// @ts-ignore
	Module._resolveLookupPAths = function (moduleNAme, pArent) {
		const pAths = originAlResolveLookupPAths(moduleNAme, pArent);
		if (ArrAy.isArrAy(pAths)) {
			for (let i = 0, len = pAths.length; i < len; i++) {
				if (pAths[i] === nodeModulesPAth) {
					pAths.splice(i, 0, injectPAth);
					breAk;
				}
			}
		}

		return pAths;
	};
};

exports.removeGlobAlNodeModuleLookupPAths = function () {
	const Module = require('module');
	// @ts-ignore
	const globAlPAths = Module.globAlPAths;

	// @ts-ignore
	const originAlResolveLookupPAths = Module._resolveLookupPAths;

	// @ts-ignore
	Module._resolveLookupPAths = function (moduleNAme, pArent) {
		const pAths = originAlResolveLookupPAths(moduleNAme, pArent);
		let commonSuffixLength = 0;
		while (commonSuffixLength < pAths.length && pAths[pAths.length - 1 - commonSuffixLength] === globAlPAths[globAlPAths.length - 1 - commonSuffixLength]) {
			commonSuffixLength++;
		}
		return pAths.slice(0, pAths.length - commonSuffixLength);
	};
};
