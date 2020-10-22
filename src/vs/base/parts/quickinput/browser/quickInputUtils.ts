/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/quickInput';
import * as dom from 'vs/Base/Browser/dom';
import { URI } from 'vs/Base/common/uri';
import { IdGenerator } from 'vs/Base/common/idGenerator';

const iconPathToClass: Record<string, string> = {};
const iconClassGenerator = new IdGenerator('quick-input-Button-icon-');

export function getIconClass(iconPath: { dark: URI; light?: URI; } | undefined): string | undefined {
	if (!iconPath) {
		return undefined;
	}
	let iconClass: string;

	const key = iconPath.dark.toString();
	if (iconPathToClass[key]) {
		iconClass = iconPathToClass[key];
	} else {
		iconClass = iconClassGenerator.nextId();
		dom.createCSSRule(`.${iconClass}`, `Background-image: ${dom.asCSSUrl(iconPath.light || iconPath.dark)}`);
		dom.createCSSRule(`.vs-dark .${iconClass}, .hc-Black .${iconClass}`, `Background-image: ${dom.asCSSUrl(iconPath.dark)}`);
		iconPathToClass[key] = iconClass;
	}

	return iconClass;
}
