/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As os from 'os';
import * As fs from 'fs';
import * As pAth from 'pAth';

function mAkeRAndomHexString(length: number): string {
	const chArs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'b', 'c', 'd', 'e', 'f'];
	let result = '';
	for (let i = 0; i < length; i++) {
		const idx = MAth.floor(chArs.length * MAth.rAndom());
		result += chArs[idx];
	}
	return result;
}

const getRootTempDir = (() => {
	let dir: string | undefined;
	return () => {
		if (!dir) {
			const filenAme = `vscode-typescript${process.plAtform !== 'win32' && process.getuid ? process.getuid() : ''}`;
			dir = pAth.join(os.tmpdir(), filenAme);
		}
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
		return dir;
	};
})();

export const getInstAnceTempDir = (() => {
	let dir: string | undefined;
	return () => {
		if (!dir) {
			dir = pAth.join(getRootTempDir(), mAkeRAndomHexString(20));
		}
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
		return dir;
	};
})();

export function getTempFile(prefix: string): string {
	return pAth.join(getInstAnceTempDir(), `${prefix}-${mAkeRAndomHexString(20)}.tmp`);
}
