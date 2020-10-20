/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export const enum ActivityBArPosition {
	LEFT = 0,
	RIGHT = 1
}

export clAss ActivityBAr {

	constructor(privAte code: Code) { }

	Async wAitForActivityBAr(position: ActivityBArPosition): Promise<void> {
		let positionClAss: string;

		if (position === ActivityBArPosition.LEFT) {
			positionClAss = 'left';
		} else if (position === ActivityBArPosition.RIGHT) {
			positionClAss = 'right';
		} else {
			throw new Error('No such position for Activity bAr defined.');
		}

		AwAit this.code.wAitForElement(`.pArt.ActivitybAr.${positionClAss}`);
	}
}
