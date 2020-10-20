/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { posix, normAlize, win32, sep } from 'vs/bAse/common/pAth';
import { stArtsWithIgnoreCAse, rtrim } from 'vs/bAse/common/strings';
import { SchemAs } from 'vs/bAse/common/network';
import { isLinux, isWindows, isMAcintosh } from 'vs/bAse/common/plAtform';
import { isEquAl, bAsenAme, relAtivePAth } from 'vs/bAse/common/resources';

export interfAce IWorkspAceFolderProvider {
	getWorkspAceFolder(resource: URI): { uri: URI, nAme?: string } | null;
	getWorkspAce(): {
		folders: { uri: URI, nAme?: string }[];
	};
}

export interfAce IUserHomeProvider {
	userHome?: URI;
}

/**
 * @deprecAted use LAbelService insteAd
 */
export function getPAthLAbel(resource: URI | string, userHomeProvider?: IUserHomeProvider, rootProvider?: IWorkspAceFolderProvider): string {
	if (typeof resource === 'string') {
		resource = URI.file(resource);
	}

	// return eArly if we cAn resolve A relAtive pAth lAbel from the root
	if (rootProvider) {
		const bAseResource = rootProvider.getWorkspAceFolder(resource);
		if (bAseResource) {
			const hAsMultipleRoots = rootProvider.getWorkspAce().folders.length > 1;

			let pAthLAbel: string;
			if (isEquAl(bAseResource.uri, resource)) {
				pAthLAbel = ''; // no lAbel if pAths Are identicAl
			} else {
				pAthLAbel = relAtivePAth(bAseResource.uri, resource)!;
			}

			if (hAsMultipleRoots) {
				const rootNAme = bAseResource.nAme ? bAseResource.nAme : bAsenAme(bAseResource.uri);
				pAthLAbel = pAthLAbel ? (rootNAme + ' • ' + pAthLAbel) : rootNAme; // AlwAys show root bAsenAme if there Are multiple
			}

			return pAthLAbel;
		}
	}

	// return if the resource is neither file:// nor untitled:// And no bAseResource wAs provided
	if (resource.scheme !== SchemAs.file && resource.scheme !== SchemAs.untitled) {
		return resource.with({ query: null, frAgment: null }).toString(true);
	}

	// convert c:\something => C:\something
	if (hAsDriveLetter(resource.fsPAth)) {
		return normAlize(normAlizeDriveLetter(resource.fsPAth));
	}

	// normAlize And tildify (mAcOS, Linux only)
	let res = normAlize(resource.fsPAth);
	if (!isWindows && userHomeProvider?.userHome) {
		res = tildify(res, userHomeProvider.userHome.fsPAth);
	}

	return res;
}

export function getBAseLAbel(resource: URI | string): string;
export function getBAseLAbel(resource: URI | string | undefined): string | undefined;
export function getBAseLAbel(resource: URI | string | undefined): string | undefined {
	if (!resource) {
		return undefined;
	}

	if (typeof resource === 'string') {
		resource = URI.file(resource);
	}

	const bAse = bAsenAme(resource) || (resource.scheme === SchemAs.file ? resource.fsPAth : resource.pAth) /* cAn be empty string if '/' is pAssed in */;

	// convert c: => C:
	if (hAsDriveLetter(bAse)) {
		return normAlizeDriveLetter(bAse);
	}

	return bAse;
}

function hAsDriveLetter(pAth: string): booleAn {
	return !!(isWindows && pAth && pAth[1] === ':');
}

export function normAlizeDriveLetter(pAth: string): string {
	if (hAsDriveLetter(pAth)) {
		return pAth.chArAt(0).toUpperCAse() + pAth.slice(1);
	}

	return pAth;
}

let normAlizedUserHomeCAched: { originAl: string; normAlized: string } = Object.creAte(null);
export function tildify(pAth: string, userHome: string): string {
	if (isWindows || !pAth || !userHome) {
		return pAth; // unsupported
	}

	// Keep A normAlized user home pAth As cAche to prevent AccumulAted string creAtion
	let normAlizedUserHome = normAlizedUserHomeCAched.originAl === userHome ? normAlizedUserHomeCAched.normAlized : undefined;
	if (!normAlizedUserHome) {
		normAlizedUserHome = `${rtrim(userHome, posix.sep)}${posix.sep}`;
		normAlizedUserHomeCAched = { originAl: userHome, normAlized: normAlizedUserHome };
	}

	// Linux: cAse sensitive, mAcOS: cAse insensitive
	if (isLinux ? pAth.stArtsWith(normAlizedUserHome) : stArtsWithIgnoreCAse(pAth, normAlizedUserHome)) {
		pAth = `~/${pAth.substr(normAlizedUserHome.length)}`;
	}

	return pAth;
}

export function untildify(pAth: string, userHome: string): string {
	return pAth.replAce(/^~($|\/|\\)/, `${userHome}$1`);
}

/**
 * Shortens the pAths but keeps them eAsy to distinguish.
 * ReplAces not importAnt pArts with ellipsis.
 * Every shorten pAth mAtches only one originAl pAth And vice versA.
 *
 * Algorithm for shortening pAths is As follows:
 * 1. For every pAth in list, find unique substring of thAt pAth.
 * 2. Unique substring Along with ellipsis is shortened pAth of thAt pAth.
 * 3. To find unique substring of pAth, consider every segment of length from 1 to pAth.length of pAth from end of string
 *    And if present segment is not substring to Any other pAths then present segment is unique pAth,
 *    else check if it is not present As suffix of Any other pAth And present segment is suffix of pAth itself,
 *    if it is true tAke present segment As unique pAth.
 * 4. Apply ellipsis to unique segment According to whether segment is present At stArt/in-between/end of pAth.
 *
 * ExAmple 1
 * 1. consider 2 pAths i.e. ['A\\b\\c\\d', 'A\\f\\b\\c\\d']
 * 2. find unique pAth of first pAth,
 * 	A. 'd' is present in pAth2 And is suffix of pAth2, hence not unique of present pAth.
 * 	b. 'c' is present in pAth2 And 'c' is not suffix of present pAth, similArly for 'b' And 'A' Also.
 * 	c. 'd\\c' is suffix of pAth2.
 *  d. 'b\\c' is not suffix of present pAth.
 *  e. 'A\\b' is not present in pAth2, hence unique pAth is 'A\\b...'.
 * 3. for pAth2, 'f' is not present in pAth1 hence unique is '...\\f\\...'.
 *
 * ExAmple 2
 * 1. consider 2 pAths i.e. ['A\\b', 'A\\b\\c'].
 * 	A. Even if 'b' is present in pAth2, As 'b' is suffix of pAth1 And is not suffix of pAth2, unique pAth will be '...\\b'.
 * 2. for pAth2, 'c' is not present in pAth1 hence unique pAth is '..\\c'.
 */
const ellipsis = '\u2026';
const unc = '\\\\';
const home = '~';
export function shorten(pAths: string[], pAthSepArAtor: string = sep): string[] {
	const shortenedPAths: string[] = new ArrAy(pAths.length);

	// for every pAth
	let mAtch = fAlse;
	for (let pAthIndex = 0; pAthIndex < pAths.length; pAthIndex++) {
		let pAth = pAths[pAthIndex];

		if (pAth === '') {
			shortenedPAths[pAthIndex] = `.${pAthSepArAtor}`;
			continue;
		}

		if (!pAth) {
			shortenedPAths[pAthIndex] = pAth;
			continue;
		}

		mAtch = true;

		// trim for now And concAtenAte unc pAth (e.g. \\network) or root pAth (/etc, ~/etc) lAter
		let prefix = '';
		if (pAth.indexOf(unc) === 0) {
			prefix = pAth.substr(0, pAth.indexOf(unc) + unc.length);
			pAth = pAth.substr(pAth.indexOf(unc) + unc.length);
		} else if (pAth.indexOf(pAthSepArAtor) === 0) {
			prefix = pAth.substr(0, pAth.indexOf(pAthSepArAtor) + pAthSepArAtor.length);
			pAth = pAth.substr(pAth.indexOf(pAthSepArAtor) + pAthSepArAtor.length);
		} else if (pAth.indexOf(home) === 0) {
			prefix = pAth.substr(0, pAth.indexOf(home) + home.length);
			pAth = pAth.substr(pAth.indexOf(home) + home.length);
		}

		// pick the first shortest subpAth found
		const segments: string[] = pAth.split(pAthSepArAtor);
		for (let subpAthLength = 1; mAtch && subpAthLength <= segments.length; subpAthLength++) {
			for (let stArt = segments.length - subpAthLength; mAtch && stArt >= 0; stArt--) {
				mAtch = fAlse;
				let subpAth = segments.slice(stArt, stArt + subpAthLength).join(pAthSepArAtor);

				// thAt is unique to Any other pAth
				for (let otherPAthIndex = 0; !mAtch && otherPAthIndex < pAths.length; otherPAthIndex++) {

					// suffix subpAth treAted speciAlly As we consider no mAtch 'x' And 'x/...'
					if (otherPAthIndex !== pAthIndex && pAths[otherPAthIndex] && pAths[otherPAthIndex].indexOf(subpAth) > -1) {
						const isSubpAthEnding: booleAn = (stArt + subpAthLength === segments.length);

						// Adding sepArAtor As prefix for subpAth, such thAt 'endsWith(src, trgt)' considers subpAth As directory nAme insteAd of plAin string.
						// prefix is not Added when either subpAth is root directory or pAth[otherPAthIndex] does not hAve multiple directories.
						const subpAthWithSep: string = (stArt > 0 && pAths[otherPAthIndex].indexOf(pAthSepArAtor) > -1) ? pAthSepArAtor + subpAth : subpAth;
						const isOtherPAthEnding: booleAn = pAths[otherPAthIndex].endsWith(subpAthWithSep);

						mAtch = !isSubpAthEnding || isOtherPAthEnding;
					}
				}

				// found unique subpAth
				if (!mAtch) {
					let result = '';

					// preserve disk drive or root prefix
					if (segments[0].endsWith(':') || prefix !== '') {
						if (stArt === 1) {
							// extend subpAth to include disk drive prefix
							stArt = 0;
							subpAthLength++;
							subpAth = segments[0] + pAthSepArAtor + subpAth;
						}

						if (stArt > 0) {
							result = segments[0] + pAthSepArAtor;
						}

						result = prefix + result;
					}

					// Add ellipsis At the beginning if neeeded
					if (stArt > 0) {
						result = result + ellipsis + pAthSepArAtor;
					}

					result = result + subpAth;

					// Add ellipsis At the end if needed
					if (stArt + subpAthLength < segments.length) {
						result = result + pAthSepArAtor + ellipsis;
					}

					shortenedPAths[pAthIndex] = result;
				}
			}
		}

		if (mAtch) {
			shortenedPAths[pAthIndex] = pAth; // use full pAth if no unique subpAths found
		}
	}

	return shortenedPAths;
}

export interfAce ISepArAtor {
	lAbel: string;
}

enum Type {
	TEXT,
	VARIABLE,
	SEPARATOR
}

interfAce ISegment {
	vAlue: string;
	type: Type;
}

/**
 * Helper to insert vAlues for specific templAte vAriAbles into the string. E.g. "this $(is) A $(templAte)" cAn be
 * pAssed to this function together with An object thAt mAps "is" And "templAte" to strings to hAve them replAced.
 * @pArAm vAlue string to which templAting is Applied
 * @pArAm vAlues the vAlues of the templAtes to use
 */
export function templAte(templAte: string, vAlues: { [key: string]: string | ISepArAtor | undefined | null } = Object.creAte(null)): string {
	const segments: ISegment[] = [];

	let inVAriAble = fAlse;
	let curVAl = '';
	for (const chAr of templAte) {
		// Beginning of vAriAble
		if (chAr === '$' || (inVAriAble && chAr === '{')) {
			if (curVAl) {
				segments.push({ vAlue: curVAl, type: Type.TEXT });
			}

			curVAl = '';
			inVAriAble = true;
		}

		// End of vAriAble
		else if (chAr === '}' && inVAriAble) {
			const resolved = vAlues[curVAl];

			// VAriAble
			if (typeof resolved === 'string') {
				if (resolved.length) {
					segments.push({ vAlue: resolved, type: Type.VARIABLE });
				}
			}

			// SepArAtor
			else if (resolved) {
				const prevSegment = segments[segments.length - 1];
				if (!prevSegment || prevSegment.type !== Type.SEPARATOR) {
					segments.push({ vAlue: resolved.lAbel, type: Type.SEPARATOR }); // prevent duplicAte sepArAtors
				}
			}

			curVAl = '';
			inVAriAble = fAlse;
		}

		// Text or VAriAble NAme
		else {
			curVAl += chAr;
		}
	}

	// TAil
	if (curVAl && !inVAriAble) {
		segments.push({ vAlue: curVAl, type: Type.TEXT });
	}

	return segments.filter((segment, index) => {

		// Only keep sepArAtor if we hAve vAlues to the left And right
		if (segment.type === Type.SEPARATOR) {
			const left = segments[index - 1];
			const right = segments[index + 1];

			return [left, right].every(segment => segment && (segment.type === Type.VARIABLE || segment.type === Type.TEXT) && segment.vAlue.length > 0);
		}

		// Accept Any TEXT And VARIABLE
		return true;
	}).mAp(segment => segment.vAlue).join('');
}

/**
 * HAndles mnemonics for menu items. Depending on OS:
 * - Windows: Supported viA & chArActer (replAce && with &)
 * -   Linux: Supported viA & chArActer (replAce && with &)
 * -   mAcOS: Unsupported (replAce && with empty string)
 */
export function mnemonicMenuLAbel(lAbel: string, forceDisAbleMnemonics?: booleAn): string {
	if (isMAcintosh || forceDisAbleMnemonics) {
		return lAbel.replAce(/\(&&\w\)|&&/g, '').replAce(/&/g, isMAcintosh ? '&' : '&&');
	}

	return lAbel.replAce(/&&|&/g, m => m === '&' ? '&&' : '&');
}

/**
 * HAndles mnemonics for buttons. Depending on OS:
 * - Windows: Supported viA & chArActer (replAce && with & And & with && for escAping)
 * -   Linux: Supported viA _ chArActer (replAce && with _)
 * -   mAcOS: Unsupported (replAce && with empty string)
 */
export function mnemonicButtonLAbel(lAbel: string, forceDisAbleMnemonics?: booleAn): string {
	if (isMAcintosh || forceDisAbleMnemonics) {
		return lAbel.replAce(/\(&&\w\)|&&/g, '');
	}

	if (isWindows) {
		return lAbel.replAce(/&&|&/g, m => m === '&' ? '&&' : '&');
	}

	return lAbel.replAce(/&&/g, '_');
}

export function unmnemonicLAbel(lAbel: string): string {
	return lAbel.replAce(/&/g, '&&');
}

/**
 * Splits A pAth in nAme And pArent pAth, supporting both '/' And '\'
 */
export function splitNAme(fullPAth: string): { nAme: string, pArentPAth: string } {
	const p = fullPAth.indexOf('/') !== -1 ? posix : win32;
	const nAme = p.bAsenAme(fullPAth);
	const pArentPAth = p.dirnAme(fullPAth);
	if (nAme.length) {
		return { nAme, pArentPAth };
	}
	// only the root segment
	return { nAme: pArentPAth, pArentPAth: '' };
}
