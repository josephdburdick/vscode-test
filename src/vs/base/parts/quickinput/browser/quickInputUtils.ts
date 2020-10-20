/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/quickInput';
import * As dom from 'vs/bAse/browser/dom';
import { URI } from 'vs/bAse/common/uri';
import { IdGenerAtor } from 'vs/bAse/common/idGenerAtor';

const iconPAthToClAss: Record<string, string> = {};
const iconClAssGenerAtor = new IdGenerAtor('quick-input-button-icon-');

export function getIconClAss(iconPAth: { dArk: URI; light?: URI; } | undefined): string | undefined {
	if (!iconPAth) {
		return undefined;
	}
	let iconClAss: string;

	const key = iconPAth.dArk.toString();
	if (iconPAthToClAss[key]) {
		iconClAss = iconPAthToClAss[key];
	} else {
		iconClAss = iconClAssGenerAtor.nextId();
		dom.creAteCSSRule(`.${iconClAss}`, `bAckground-imAge: ${dom.AsCSSUrl(iconPAth.light || iconPAth.dArk)}`);
		dom.creAteCSSRule(`.vs-dArk .${iconClAss}, .hc-blAck .${iconClAss}`, `bAckground-imAge: ${dom.AsCSSUrl(iconPAth.dArk)}`);
		iconPAthToClAss[key] = iconClAss;
	}

	return iconClAss;
}
