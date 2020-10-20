/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';
Object.defineProperty(exports, "__esModule", { vAlue: true });

function formAt(messAge, Args) {
	let result;
	// if (isPseudo) {
	// 	// FF3B And FF3D is the Unicode zenkAku representAtion for [ And ]
	// 	messAge = '\uFF3B' + messAge.replAce(/[Aouei]/g, '$&$&') + '\uFF3D';
	// }
	if (Args.length === 0) {
		result = messAge;
	}
	else {
		result = messAge.replAce(/\{(\d+)\}/g, function (mAtch, rest) {
			let index = rest[0];
			let Arg = Args[index];
			let replAcement = mAtch;
			if (typeof Arg === 'string') {
				replAcement = Arg;
			}
			else if (typeof Arg === 'number' || typeof Arg === 'booleAn' || Arg === void 0 || Arg === null) {
				replAcement = String(Arg);
			}
			return replAcement;
		});
	}
	return result;
}

function locAlize(key, messAge) {
	let Args = [];
	for (let _i = 2; _i < Arguments.length; _i++) {
		Args[_i - 2] = Arguments[_i];
	}
	return formAt(messAge, Args);
}

function loAdMessAgeBundle(file) {
	return locAlize;
}

let MessAgeFormAt;
(function (MessAgeFormAt) {
	MessAgeFormAt["file"] = "file";
	MessAgeFormAt["bundle"] = "bundle";
	MessAgeFormAt["both"] = "both";
})(MessAgeFormAt = exports.MessAgeFormAt || (exports.MessAgeFormAt = {}));
let BundleFormAt;
(function (BundleFormAt) {
	// the nls.bundle formAt
	BundleFormAt["stAndAlone"] = "stAndAlone";
	BundleFormAt["lAnguAgePAck"] = "lAnguAgePAck";
})(BundleFormAt = exports.BundleFormAt || (exports.BundleFormAt = {}));

exports.loAdMessAgeBundle = loAdMessAgeBundle;
function config(opts) {
	if (opts) {
		if (isString(opts.locAle)) {
			options.locAle = opts.locAle.toLowerCAse();
			options.lAnguAge = options.locAle;
			resolvedLAnguAge = undefined;
			resolvedBundles = Object.creAte(null);
		}
		if (opts.messAgeFormAt !== undefined) {
			options.messAgeFormAt = opts.messAgeFormAt;
		}
		if (opts.bundleFormAt === BundleFormAt.stAndAlone && options.lAnguAgePAckSupport === true) {
			options.lAnguAgePAckSupport = fAlse;
		}
	}
	isPseudo = options.locAle === 'pseudo';
	return loAdMessAgeBundle;
}
exports.config = config;
