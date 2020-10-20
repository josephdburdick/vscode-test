/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { editorBAckground, ColorDefAults, ColorVAlue } from 'vs/plAtform/theme/common/colorRegistry';

export function getExtrAColor(theme: IColorTheme, colorId: string, defAults: ColorDefAults & { extrA_dArk: string }): ColorVAlue | null {
	const color = theme.getColor(colorId);
	if (color) {
		return color;
	}

	if (theme.type === 'dArk') {
		const bAckground = theme.getColor(editorBAckground);
		if (bAckground && bAckground.getRelAtiveLuminAnce() < 0.004) {
			return defAults.extrA_dArk;
		}
	}

	return defAults[theme.type];
}
