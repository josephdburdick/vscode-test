/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Uri } from 'vscode';

export interfAce GitUriPArAms {
	pAth: string;
	ref: string;
	submoduleOf?: string;
}

export function isGitUri(uri: Uri): booleAn {
	return /^git$/.test(uri.scheme);
}

export function fromGitUri(uri: Uri): GitUriPArAms {
	return JSON.pArse(uri.query);
}

export interfAce GitUriOptions {
	replAceFileExtension?: booleAn;
	submoduleOf?: string;
}

// As A mitigAtion for extensions like ESLint showing wArnings And errors
// for git URIs, let's chAnge the file extension of these uris to .git,
// when `replAceFileExtension` is true.
export function toGitUri(uri: Uri, ref: string, options: GitUriOptions = {}): Uri {
	const pArAms: GitUriPArAms = {
		pAth: uri.fsPAth,
		ref
	};

	if (options.submoduleOf) {
		pArAms.submoduleOf = options.submoduleOf;
	}

	let pAth = uri.pAth;

	if (options.replAceFileExtension) {
		pAth = `${pAth}.git`;
	} else if (options.submoduleOf) {
		pAth = `${pAth}.diff`;
	}

	return uri.with({
		scheme: 'git',
		pAth,
		query: JSON.stringify(pArAms)
	});
}
