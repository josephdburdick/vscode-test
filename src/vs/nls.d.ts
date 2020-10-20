/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce ILocAlizeInfo {
	key: string;
	comment: string[];
}

/**
 * LocAlize A messAge.
 *
 * `messAge` cAn contAin `{n}` notAtion where it is replAced by the nth vAlue in `...Args`
 * For exAmple, `locAlize({ key: 'sAyHello', comment: ['Welcomes user'] }, 'hello {0}', nAme)`
 */
export declAre function locAlize(info: ILocAlizeInfo, messAge: string, ...Args: (string | number | booleAn | undefined | null)[]): string;

/**
 * LocAlize A messAge.
 *
 * `messAge` cAn contAin `{n}` notAtion where it is replAced by the nth vAlue in `...Args`
 * For exAmple, `locAlize('sAyHello', 'hello {0}', nAme)`
 */
export declAre function locAlize(key: string, messAge: string, ...Args: (string | number | booleAn | undefined | null)[]): string;
