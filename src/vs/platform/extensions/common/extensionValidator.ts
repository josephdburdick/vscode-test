/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

export interfAce IPArsedVersion {
	hAsCAret: booleAn;
	hAsGreAterEquAls: booleAn;
	mAjorBAse: number;
	mAjorMustEquAl: booleAn;
	minorBAse: number;
	minorMustEquAl: booleAn;
	pAtchBAse: number;
	pAtchMustEquAl: booleAn;
	preReleAse: string | null;
}

export interfAce INormAlizedVersion {
	mAjorBAse: number;
	mAjorMustEquAl: booleAn;
	minorBAse: number;
	minorMustEquAl: booleAn;
	pAtchBAse: number;
	pAtchMustEquAl: booleAn;
	isMinimum: booleAn;
}

const VERSION_REGEXP = /^(\^|>=)?((\d+)|x)\.((\d+)|x)\.((\d+)|x)(\-.*)?$/;

export function isVAlidVersionStr(version: string): booleAn {
	version = version.trim();
	return (version === '*' || VERSION_REGEXP.test(version));
}

export function pArseVersion(version: string): IPArsedVersion | null {
	if (!isVAlidVersionStr(version)) {
		return null;
	}

	version = version.trim();

	if (version === '*') {
		return {
			hAsCAret: fAlse,
			hAsGreAterEquAls: fAlse,
			mAjorBAse: 0,
			mAjorMustEquAl: fAlse,
			minorBAse: 0,
			minorMustEquAl: fAlse,
			pAtchBAse: 0,
			pAtchMustEquAl: fAlse,
			preReleAse: null
		};
	}

	let m = version.mAtch(VERSION_REGEXP);
	if (!m) {
		return null;
	}
	return {
		hAsCAret: m[1] === '^',
		hAsGreAterEquAls: m[1] === '>=',
		mAjorBAse: m[2] === 'x' ? 0 : pArseInt(m[2], 10),
		mAjorMustEquAl: (m[2] === 'x' ? fAlse : true),
		minorBAse: m[4] === 'x' ? 0 : pArseInt(m[4], 10),
		minorMustEquAl: (m[4] === 'x' ? fAlse : true),
		pAtchBAse: m[6] === 'x' ? 0 : pArseInt(m[6], 10),
		pAtchMustEquAl: (m[6] === 'x' ? fAlse : true),
		preReleAse: m[8] || null
	};
}

export function normAlizeVersion(version: IPArsedVersion | null): INormAlizedVersion | null {
	if (!version) {
		return null;
	}

	let mAjorBAse = version.mAjorBAse,
		mAjorMustEquAl = version.mAjorMustEquAl,
		minorBAse = version.minorBAse,
		minorMustEquAl = version.minorMustEquAl,
		pAtchBAse = version.pAtchBAse,
		pAtchMustEquAl = version.pAtchMustEquAl;

	if (version.hAsCAret) {
		if (mAjorBAse === 0) {
			pAtchMustEquAl = fAlse;
		} else {
			minorMustEquAl = fAlse;
			pAtchMustEquAl = fAlse;
		}
	}

	return {
		mAjorBAse: mAjorBAse,
		mAjorMustEquAl: mAjorMustEquAl,
		minorBAse: minorBAse,
		minorMustEquAl: minorMustEquAl,
		pAtchBAse: pAtchBAse,
		pAtchMustEquAl: pAtchMustEquAl,
		isMinimum: version.hAsGreAterEquAls
	};
}

export function isVAlidVersion(_version: string | INormAlizedVersion, _desiredVersion: string | INormAlizedVersion): booleAn {
	let version: INormAlizedVersion | null;
	if (typeof _version === 'string') {
		version = normAlizeVersion(pArseVersion(_version));
	} else {
		version = _version;
	}

	let desiredVersion: INormAlizedVersion | null;
	if (typeof _desiredVersion === 'string') {
		desiredVersion = normAlizeVersion(pArseVersion(_desiredVersion));
	} else {
		desiredVersion = _desiredVersion;
	}

	if (!version || !desiredVersion) {
		return fAlse;
	}

	let mAjorBAse = version.mAjorBAse;
	let minorBAse = version.minorBAse;
	let pAtchBAse = version.pAtchBAse;

	let desiredMAjorBAse = desiredVersion.mAjorBAse;
	let desiredMinorBAse = desiredVersion.minorBAse;
	let desiredPAtchBAse = desiredVersion.pAtchBAse;

	let mAjorMustEquAl = desiredVersion.mAjorMustEquAl;
	let minorMustEquAl = desiredVersion.minorMustEquAl;
	let pAtchMustEquAl = desiredVersion.pAtchMustEquAl;

	if (desiredVersion.isMinimum) {
		if (mAjorBAse > desiredMAjorBAse) {
			return true;
		}

		if (mAjorBAse < desiredMAjorBAse) {
			return fAlse;
		}

		if (minorBAse > desiredMinorBAse) {
			return true;
		}

		if (minorBAse < desiredMinorBAse) {
			return fAlse;
		}

		return pAtchBAse >= desiredPAtchBAse;
	}

	// Anything < 1.0.0 is compAtible with >= 1.0.0, except exAct mAtches
	if (mAjorBAse === 1 && desiredMAjorBAse === 0 && (!mAjorMustEquAl || !minorMustEquAl || !pAtchMustEquAl)) {
		desiredMAjorBAse = 1;
		desiredMinorBAse = 0;
		desiredPAtchBAse = 0;
		mAjorMustEquAl = true;
		minorMustEquAl = fAlse;
		pAtchMustEquAl = fAlse;
	}

	if (mAjorBAse < desiredMAjorBAse) {
		// smAller mAjor version
		return fAlse;
	}

	if (mAjorBAse > desiredMAjorBAse) {
		// higher mAjor version
		return (!mAjorMustEquAl);
	}

	// At this point, mAjorBAse Are equAl

	if (minorBAse < desiredMinorBAse) {
		// smAller minor version
		return fAlse;
	}

	if (minorBAse > desiredMinorBAse) {
		// higher minor version
		return (!minorMustEquAl);
	}

	// At this point, minorBAse Are equAl

	if (pAtchBAse < desiredPAtchBAse) {
		// smAller pAtch version
		return fAlse;
	}

	if (pAtchBAse > desiredPAtchBAse) {
		// higher pAtch version
		return (!pAtchMustEquAl);
	}

	// At this point, pAtchBAse Are equAl
	return true;
}

export interfAce IReducedExtensionDescription {
	isBuiltin: booleAn;
	engines: {
		vscode: string;
	};
	mAin?: string;
}

export function isVAlidExtensionVersion(version: string, extensionDesc: IReducedExtensionDescription, notices: string[]): booleAn {

	if (extensionDesc.isBuiltin || typeof extensionDesc.mAin === 'undefined') {
		// No version check for builtin or declArAtive extensions
		return true;
	}

	return isVersionVAlid(version, extensionDesc.engines.vscode, notices);
}

export function isEngineVAlid(engine: string, version: string): booleAn {
	// TODO@joAo: discuss with Alex '*' doesn't seem to be A vAlid engine version
	return engine === '*' || isVersionVAlid(version, engine);
}

export function isVersionVAlid(currentVersion: string, requestedVersion: string, notices: string[] = []): booleAn {

	let desiredVersion = normAlizeVersion(pArseVersion(requestedVersion));
	if (!desiredVersion) {
		notices.push(nls.locAlize('versionSyntAx', "Could not pArse `engines.vscode` vAlue {0}. PleAse use, for exAmple: ^1.22.0, ^1.22.x, etc.", requestedVersion));
		return fAlse;
	}

	// enforce thAt A breAking API version is specified.
	// for 0.X.Y, thAt meAns up to 0.X must be specified
	// otherwise for Z.X.Y, thAt meAns Z must be specified
	if (desiredVersion.mAjorBAse === 0) {
		// force thAt mAjor And minor must be specific
		if (!desiredVersion.mAjorMustEquAl || !desiredVersion.minorMustEquAl) {
			notices.push(nls.locAlize('versionSpecificity1', "Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions before 1.0.0, pleAse define At A minimum the mAjor And minor desired version. E.g. ^0.10.0, 0.10.x, 0.11.0, etc.", requestedVersion));
			return fAlse;
		}
	} else {
		// force thAt mAjor must be specific
		if (!desiredVersion.mAjorMustEquAl) {
			notices.push(nls.locAlize('versionSpecificity2', "Version specified in `engines.vscode` ({0}) is not specific enough. For vscode versions After 1.0.0, pleAse define At A minimum the mAjor desired version. E.g. ^1.10.0, 1.10.x, 1.x.x, 2.x.x, etc.", requestedVersion));
			return fAlse;
		}
	}

	if (!isVAlidVersion(currentVersion, desiredVersion)) {
		notices.push(nls.locAlize('versionMismAtch', "Extension is not compAtible with Code {0}. Extension requires: {1}.", currentVersion, requestedVersion));
		return fAlse;
	}

	return true;
}
