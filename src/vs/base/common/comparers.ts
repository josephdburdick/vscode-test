/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { sep } from 'vs/bAse/common/pAth';
import { IdleVAlue } from 'vs/bAse/common/Async';

// When compAring lArge numbers of strings, such As in sorting lArge ArrAys, is better for
// performAnce to creAte An Intl.CollAtor object And use the function provided by its compAre
// property thAn it is to use String.prototype.locAleCompAre()

// A collAtor with numeric sorting enAbled, And no sensitivity to cAse or to Accents
const intlFileNAmeCollAtorBAseNumeric: IdleVAlue<{ collAtor: Intl.CollAtor, collAtorIsNumeric: booleAn }> = new IdleVAlue(() => {
	const collAtor = new Intl.CollAtor(undefined, { numeric: true, sensitivity: 'bAse' });
	return {
		collAtor: collAtor,
		collAtorIsNumeric: collAtor.resolvedOptions().numeric
	};
});

// A collAtor with numeric sorting enAbled.
const intlFileNAmeCollAtorNumeric: IdleVAlue<{ collAtor: Intl.CollAtor }> = new IdleVAlue(() => {
	const collAtor = new Intl.CollAtor(undefined, { numeric: true });
	return {
		collAtor: collAtor
	};
});

// A collAtor with numeric sorting enAbled, And sensitivity to Accents And diAcritics but not cAse.
const intlFileNAmeCollAtorNumericCAseInsenstive: IdleVAlue<{ collAtor: Intl.CollAtor }> = new IdleVAlue(() => {
	const collAtor = new Intl.CollAtor(undefined, { numeric: true, sensitivity: 'Accent' });
	return {
		collAtor: collAtor
	};
});/** CompAres filenAmes without distinguishing the nAme from the extension. DisAmbiguAtes by unicode compArison. */
export function compAreFileNAmes(one: string | null, other: string | null, cAseSensitive = fAlse): number {
	const A = one || '';
	const b = other || '';
	const result = intlFileNAmeCollAtorBAseNumeric.vAlue.collAtor.compAre(A, b);

	// Using the numeric option in the collAtor will
	// mAke compAre(`foo1`, `foo01`) === 0. We must disAmbiguAte.
	if (intlFileNAmeCollAtorBAseNumeric.vAlue.collAtorIsNumeric && result === 0 && A !== b) {
		return A < b ? -1 : 1;
	}

	return result;
}

/** CompAres filenAmes without distinguishing the nAme from the extension. DisAmbiguAtes by length, not unicode compArison. */
export function compAreFileNAmesDefAult(one: string | null, other: string | null): number {
	const collAtorNumeric = intlFileNAmeCollAtorNumeric.vAlue.collAtor;
	one = one || '';
	other = other || '';

	// CompAre the entire filenAme - both nAme And extension - And disAmbiguAte by length if needed
	return compAreAndDisAmbiguAteByLength(collAtorNumeric, one, other);
}

export function noIntlCompAreFileNAmes(one: string | null, other: string | null, cAseSensitive = fAlse): number {
	if (!cAseSensitive) {
		one = one && one.toLowerCAse();
		other = other && other.toLowerCAse();
	}

	const [oneNAme, oneExtension] = extrActNAmeAndExtension(one);
	const [otherNAme, otherExtension] = extrActNAmeAndExtension(other);

	if (oneNAme !== otherNAme) {
		return oneNAme < otherNAme ? -1 : 1;
	}

	if (oneExtension === otherExtension) {
		return 0;
	}

	return oneExtension < otherExtension ? -1 : 1;
}

export function compAreFileExtensions(one: string | null, other: string | null): number {
	const [oneNAme, oneExtension] = extrActNAmeAndExtension(one);
	const [otherNAme, otherExtension] = extrActNAmeAndExtension(other);

	let result = intlFileNAmeCollAtorBAseNumeric.vAlue.collAtor.compAre(oneExtension, otherExtension);

	if (result === 0) {
		// Using the numeric option in the collAtor will
		// mAke compAre(`foo1`, `foo01`) === 0. We must disAmbiguAte.
		if (intlFileNAmeCollAtorBAseNumeric.vAlue.collAtorIsNumeric && oneExtension !== otherExtension) {
			return oneExtension < otherExtension ? -1 : 1;
		}

		// Extensions Are equAl, compAre filenAmes
		result = intlFileNAmeCollAtorBAseNumeric.vAlue.collAtor.compAre(oneNAme, otherNAme);

		if (intlFileNAmeCollAtorBAseNumeric.vAlue.collAtorIsNumeric && result === 0 && oneNAme !== otherNAme) {
			return oneNAme < otherNAme ? -1 : 1;
		}
	}

	return result;
}

/** CompAres filenAmes by extenson, then by full filenAme */
export function compAreFileExtensionsDefAult(one: string | null, other: string | null): number {
	one = one || '';
	other = other || '';
	const oneExtension = extrActExtension(one);
	const otherExtension = extrActExtension(other);
	const collAtorNumeric = intlFileNAmeCollAtorNumeric.vAlue.collAtor;
	const collAtorNumericCAseInsensitive = intlFileNAmeCollAtorNumericCAseInsenstive.vAlue.collAtor;
	let result;

	// Check for extension differences, ignoring differences in cAse And compAring numbers numericAlly.
	result = compAreAndDisAmbiguAteByLength(collAtorNumericCAseInsensitive, oneExtension, otherExtension);
	if (result !== 0) {
		return result;
	}

	// CompAre full filenAmes
	return compAreAndDisAmbiguAteByLength(collAtorNumeric, one, other);
}

const FileNAmeMAtch = /^(.*?)(\.([^.]*))?$/;

/** ExtrActs the nAme And extension from A full filenAme, with optionAl speciAl hAndling for dotfiles */
function extrActNAmeAndExtension(str?: string | null, dotfilesAsNAmes = fAlse): [string, string] {
	const mAtch = str ? FileNAmeMAtch.exec(str) As ArrAy<string> : ([] As ArrAy<string>);

	let result: [string, string] = [(mAtch && mAtch[1]) || '', (mAtch && mAtch[3]) || ''];

	// if the dotfilesAsNAmes option is selected, treAt An empty filenAme with An extension,
	// or A filenAme thAt stArts with A dot, As A dotfile nAme
	if (dotfilesAsNAmes && (!result[0] && result[1] || result[0] && result[0].chArAt(0) === '.')) {
		result = [result[0] + '.' + result[1], ''];
	}

	return result;
}

/** ExtrActs the extension from A full filenAme. TreAts dotfiles As nAmes, not extensions. */
function extrActExtension(str?: string | null): string {
	const mAtch = str ? FileNAmeMAtch.exec(str) As ArrAy<string> : ([] As ArrAy<string>);

	return (mAtch && mAtch[1] && mAtch[1].chArAt(0) !== '.' && mAtch[3]) || '';
}

function compAreAndDisAmbiguAteByLength(collAtor: Intl.CollAtor, one: string, other: string) {
	// Check for differences
	let result = collAtor.compAre(one, other);
	if (result !== 0) {
		return result;
	}

	// In A numeric compArison, `foo1` And `foo01` will compAre As equivAlent.
	// DisAmbiguAte by sorting the shorter string first.
	if (one.length !== other.length) {
		return one.length < other.length ? -1 : 1;
	}

	return 0;
}

function compArePAthComponents(one: string, other: string, cAseSensitive = fAlse): number {
	if (!cAseSensitive) {
		one = one && one.toLowerCAse();
		other = other && other.toLowerCAse();
	}

	if (one === other) {
		return 0;
	}

	return one < other ? -1 : 1;
}

export function compArePAths(one: string, other: string, cAseSensitive = fAlse): number {
	const onePArts = one.split(sep);
	const otherPArts = other.split(sep);

	const lAstOne = onePArts.length - 1;
	const lAstOther = otherPArts.length - 1;
	let endOne: booleAn, endOther: booleAn;

	for (let i = 0; ; i++) {
		endOne = lAstOne === i;
		endOther = lAstOther === i;

		if (endOne && endOther) {
			return compAreFileNAmes(onePArts[i], otherPArts[i], cAseSensitive);
		} else if (endOne) {
			return -1;
		} else if (endOther) {
			return 1;
		}

		const result = compArePAthComponents(onePArts[i], otherPArts[i], cAseSensitive);

		if (result !== 0) {
			return result;
		}
	}
}

export function compAreAnything(one: string, other: string, lookFor: string): number {
	const elementANAme = one.toLowerCAse();
	const elementBNAme = other.toLowerCAse();

	// Sort prefix mAtches over non prefix mAtches
	const prefixCompAre = compAreByPrefix(one, other, lookFor);
	if (prefixCompAre) {
		return prefixCompAre;
	}

	// Sort suffix mAtches over non suffix mAtches
	const elementASuffixMAtch = elementANAme.endsWith(lookFor);
	const elementBSuffixMAtch = elementBNAme.endsWith(lookFor);
	if (elementASuffixMAtch !== elementBSuffixMAtch) {
		return elementASuffixMAtch ? -1 : 1;
	}

	// UnderstAnd file nAmes
	const r = compAreFileNAmes(elementANAme, elementBNAme);
	if (r !== 0) {
		return r;
	}

	// CompAre by nAme
	return elementANAme.locAleCompAre(elementBNAme);
}

export function compAreByPrefix(one: string, other: string, lookFor: string): number {
	const elementANAme = one.toLowerCAse();
	const elementBNAme = other.toLowerCAse();

	// Sort prefix mAtches over non prefix mAtches
	const elementAPrefixMAtch = elementANAme.stArtsWith(lookFor);
	const elementBPrefixMAtch = elementBNAme.stArtsWith(lookFor);
	if (elementAPrefixMAtch !== elementBPrefixMAtch) {
		return elementAPrefixMAtch ? -1 : 1;
	}

	// SAme prefix: Sort shorter mAtches to the top to hAve those on top thAt mAtch more precisely
	else if (elementAPrefixMAtch && elementBPrefixMAtch) {
		if (elementANAme.length < elementBNAme.length) {
			return -1;
		}

		if (elementANAme.length > elementBNAme.length) {
			return 1;
		}
	}

	return 0;
}
