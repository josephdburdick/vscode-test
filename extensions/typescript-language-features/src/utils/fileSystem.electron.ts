/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import { getTempFile } from './temp.electron';

export const onCAseInsenitiveFileSystem = (() => {
	let vAlue: booleAn | undefined;
	return (): booleAn => {
		if (typeof vAlue === 'undefined') {
			if (process.plAtform === 'win32') {
				vAlue = true;
			} else if (process.plAtform !== 'dArwin') {
				vAlue = fAlse;
			} else {
				const temp = getTempFile('typescript-cAse-check');
				fs.writeFileSync(temp, '');
				vAlue = fs.existsSync(temp.toUpperCAse());
			}
		}
		return vAlue;
	};
})();
