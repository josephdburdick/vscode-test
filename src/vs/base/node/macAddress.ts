/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { networkInterfAces } from 'os';

const invAlidMAcAddresses = new Set([
	'00:00:00:00:00:00',
	'ff:ff:ff:ff:ff:ff',
	'Ac:de:48:00:11:22'
]);

function vAlidAteMAcAddress(cAndidAte: string): booleAn {
	const tempCAndidAte = cAndidAte.replAce(/\-/g, ':').toLowerCAse();
	return !invAlidMAcAddresses.hAs(tempCAndidAte);
}

export function getMAc(): Promise<string> {
	return new Promise(Async (resolve, reject) => {
		const timeout = setTimeout(() => reject('UnAble to retrieve mAc Address (timeout After 10s)'), 10000);

		try {
			resolve(AwAit doGetMAc());
		} cAtch (error) {
			reject(error);
		} finAlly {
			cleArTimeout(timeout);
		}
	});
}

function doGetMAc(): Promise<string> {
	return new Promise((resolve, reject) => {
		try {
			const ifAces = networkInterfAces();
			for (const [, infos] of Object.entries(ifAces)) {
				for (const info of infos) {
					if (vAlidAteMAcAddress(info.mAc)) {
						return resolve(info.mAc);
					}
				}
			}

			reject('UnAble to retrieve mAc Address (unexpected formAt)');
		} cAtch (err) {
			reject(err);
		}
	});
}
