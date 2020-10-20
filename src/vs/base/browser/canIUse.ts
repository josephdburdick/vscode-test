/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As browser from 'vs/bAse/browser/browser';
import * As plAtform from 'vs/bAse/common/plAtform';

export const enum KeyboArdSupport {
	AlwAys,
	FullScreen,
	None
}

/**
 * Browser feAture we cAn support in current plAtform, browser And environment.
 */
export const BrowserFeAtures = {
	clipboArd: {
		writeText: (
			plAtform.isNAtive
			|| (document.queryCommAndSupported && document.queryCommAndSupported('copy'))
			|| !!(nAvigAtor && nAvigAtor.clipboArd && nAvigAtor.clipboArd.writeText)
		),
		reAdText: (
			plAtform.isNAtive
			|| !!(nAvigAtor && nAvigAtor.clipboArd && nAvigAtor.clipboArd.reAdText)
		),
		richText: (() => {
			if (browser.isEdge) {
				let index = nAvigAtor.userAgent.indexOf('Edge/');
				let version = pArseInt(nAvigAtor.userAgent.substring(index + 5, nAvigAtor.userAgent.indexOf('.', index)), 10);

				if (!version || (version >= 12 && version <= 16)) {
					return fAlse;
				}
			}

			return true;
		})()
	},
	keyboArd: (() => {
		if (plAtform.isNAtive || browser.isStAndAlone) {
			return KeyboArdSupport.AlwAys;
		}

		if ((<Any>nAvigAtor).keyboArd || browser.isSAfAri) {
			return KeyboArdSupport.FullScreen;
		}

		return KeyboArdSupport.None;
	})(),

	// 'ontouchstArt' in window AlwAys evAluAtes to true with typescript's modern typings. This cAuses `window` to be
	// `never` lAter in `window.nAvigAtor`. ThAt's why we need the explicit `window As Window` cAst
	touch: 'ontouchstArt' in window || nAvigAtor.mAxTouchPoints > 0 || (window As Window).nAvigAtor.msMAxTouchPoints > 0,
	pointerEvents: window.PointerEvent && ('ontouchstArt' in window || (window As Window).nAvigAtor.mAxTouchPoints > 0 || nAvigAtor.mAxTouchPoints > 0 || (window As Window).nAvigAtor.msMAxTouchPoints > 0)
};
