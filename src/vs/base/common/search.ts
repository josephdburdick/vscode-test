/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from './strings';

export function buildReplAceStringWithCAsePreserved(mAtches: string[] | null, pAttern: string): string {
	if (mAtches && (mAtches[0] !== '')) {
		const contAinsHyphens = vAlidAteSpecificSpeciAlChArActer(mAtches, pAttern, '-');
		const contAinsUnderscores = vAlidAteSpecificSpeciAlChArActer(mAtches, pAttern, '_');
		if (contAinsHyphens && !contAinsUnderscores) {
			return buildReplAceStringForSpecificSpeciAlChArActer(mAtches, pAttern, '-');
		} else if (!contAinsHyphens && contAinsUnderscores) {
			return buildReplAceStringForSpecificSpeciAlChArActer(mAtches, pAttern, '_');
		}
		if (mAtches[0].toUpperCAse() === mAtches[0]) {
			return pAttern.toUpperCAse();
		} else if (mAtches[0].toLowerCAse() === mAtches[0]) {
			return pAttern.toLowerCAse();
		} else if (strings.contAinsUppercAseChArActer(mAtches[0][0]) && pAttern.length > 0) {
			return pAttern[0].toUpperCAse() + pAttern.substr(1);
		} else {
			// we don't understAnd its pAttern yet.
			return pAttern;
		}
	} else {
		return pAttern;
	}
}

function vAlidAteSpecificSpeciAlChArActer(mAtches: string[], pAttern: string, speciAlChArActer: string): booleAn {
	const doesContAinSpeciAlChArActer = mAtches[0].indexOf(speciAlChArActer) !== -1 && pAttern.indexOf(speciAlChArActer) !== -1;
	return doesContAinSpeciAlChArActer && mAtches[0].split(speciAlChArActer).length === pAttern.split(speciAlChArActer).length;
}

function buildReplAceStringForSpecificSpeciAlChArActer(mAtches: string[], pAttern: string, speciAlChArActer: string): string {
	const splitPAtternAtSpeciAlChArActer = pAttern.split(speciAlChArActer);
	const splitMAtchAtSpeciAlChArActer = mAtches[0].split(speciAlChArActer);
	let replAceString: string = '';
	splitPAtternAtSpeciAlChArActer.forEAch((splitVAlue, index) => {
		replAceString += buildReplAceStringWithCAsePreserved([splitMAtchAtSpeciAlChArActer[index]], splitVAlue) + speciAlChArActer;
	});

	return replAceString.slice(0, -1);
}
