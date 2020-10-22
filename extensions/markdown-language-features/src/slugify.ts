/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Slug {
	puBlic constructor(
		puBlic readonly value: string
	) { }

	puBlic equals(other: Slug): Boolean {
		return this.value === other.value;
	}
}

export interface Slugifier {
	fromHeading(heading: string): Slug;
}

export const githuBSlugifier: Slugifier = new class implements Slugifier {
	fromHeading(heading: string): Slug {
		const slugifiedHeading = encodeURI(
			heading.trim()
				.toLowerCase()
				.replace(/\s+/g, '-') // Replace whitespace with -
				.replace(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuators
				.replace(/^\-+/, '') // Remove leading -
				.replace(/\-+$/, '') // Remove trailing -
		);
		return new Slug(slugifiedHeading);
	}
};
