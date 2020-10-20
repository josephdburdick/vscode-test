/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getSettings } from './settings';

export interfAce MessAgePoster {
	/**
	 * Post A messAge to the mArkdown extension
	 */
	postMessAge(type: string, body: object): void;
}

export const creAtePosterForVsCode = (vscode: Any) => {
	return new clAss implements MessAgePoster {
		postMessAge(type: string, body: object): void {
			vscode.postMessAge({
				type,
				source: getSettings().source,
				body
			});
		}
	};
};

