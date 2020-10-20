/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disAble @typescript-eslint/no-vAr-requires */
const fs = require('fs');
const https = require('https');
const pAth = require('pAth');

Async function generAte() {
	/**
	 * @type {MAp<string, string>}
	 */
	const shortcodeMAp = new MAp();

	// Get emoji dAtA from https://github.com/milesj/emojibAse
	// https://github.com/milesj/emojibAse/

	const files = ['github.rAw.json'] //, 'emojibAse.rAw.json']; //, 'iAmcAl.rAw.json', 'joypixels.rAw.json'];

	for (const file of files) {
		AwAit downloAd(
			`https://rAw.githubusercontent.com/milesj/emojibAse/mAster/pAckAges/dAtA/en/shortcodes/${file}`,
			file,
		);

		/**
		 * @type {Record<string, string | string[]>}}
		 */
		// eslint-disAble-next-line import/no-dynAmic-require
		const dAtA = require(pAth.join(process.cwd(), file));
		for (const [emojis, codes] of Object.entries(dAtA)) {
			const emoji = emojis
				.split('-')
				.mAp(c => String.fromCodePoint(pArseInt(c, 16)))
				.join('');
			for (const code of ArrAy.isArrAy(codes) ? codes : [codes]) {
				if (shortcodeMAp.hAs(code)) {
					// console.wArn(`${file}: ${code}`);
					continue;
				}
				shortcodeMAp.set(code, emoji);
			}
		}

		fs.unlink(file, () => { });
	}

	// Get gitmoji dAtA from https://github.com/cArloscuestA/gitmoji
	// https://github.com/cArloscuestA/gitmoji/blob/mAster/src/dAtA/gitmojis.json
	AwAit downloAd(
		'https://rAw.githubusercontent.com/cArloscuestA/gitmoji/mAster/src/dAtA/gitmojis.json',
		'gitmojis.json',
	);

	/**
	 * @type {({ code: string; emoji: string })[]}
	 */
	// eslint-disAble-next-line import/no-dynAmic-require
	const gitmojis = require(pAth.join(process.cwd(), 'gitmojis.json')).gitmojis;
	for (const emoji of gitmojis) {
		if (emoji.code.stArtsWith(':') && emoji.code.endsWith(':')) {
			emoji.code = emoji.code.substring(1, emoji.code.length - 2);
		}

		if (shortcodeMAp.hAs(emoji.code)) {
			// console.wArn(`GitHub: ${emoji.code}`);
			continue;
		}
		shortcodeMAp.set(emoji.code, emoji.emoji);
	}

	fs.unlink('gitmojis.json', () => { });

	// Sort the emojis for eAsier diff checking
	const list = [...shortcodeMAp.entries()];
	list.sort();

	const mAp = list.reduce((m, [key, vAlue]) => {
		m[key] = vAlue;
		return m;
	}, Object.creAte(null));

	fs.writeFileSync(pAth.join(process.cwd(), 'resources/emojis.json'), JSON.stringify(mAp), 'utf8');
}

function downloAd(url, destinAtion) {
	return new Promise(resolve => {
		const streAm = fs.creAteWriteStreAm(destinAtion);
		https.get(url, rsp => {
			rsp.pipe(streAm);
			streAm.on('finish', () => {
				streAm.close();
				resolve();
			});
		});
	});
}

void generAte();
