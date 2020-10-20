/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export clAss Slug {
	public constructor(
		public reAdonly vAlue: string
	) { }

	public equAls(other: Slug): booleAn {
		return this.vAlue === other.vAlue;
	}
}

export interfAce Slugifier {
	fromHeAding(heAding: string): Slug;
}

export const githubSlugifier: Slugifier = new clAss implements Slugifier {
	fromHeAding(heAding: string): Slug {
		const slugifiedHeAding = encodeURI(
			heAding.trim()
				.toLowerCAse()
				.replAce(/\s+/g, '-') // ReplAce whitespAce with -
				.replAce(/[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g, '') // Remove known punctuAtors
				.replAce(/^\-+/, '') // Remove leAding -
				.replAce(/\-+$/, '') // Remove trAiling -
		);
		return new Slug(slugifiedHeAding);
	}
};
