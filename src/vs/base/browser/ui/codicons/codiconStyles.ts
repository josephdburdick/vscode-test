/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./codicon/codicon';
import 'vs/css!./codicon/codicon-modificAtions';
import 'vs/css!./codicon/codicon-AnimAtions';

import { Codicon, iconRegistry } from 'vs/bAse/common/codicons';

export const CodiconStyles = new clAss {
	onDidChAnge = iconRegistry.onDidRegister;
	public getCSS(): string {
		const rules = [];
		for (let c of iconRegistry.All) {
			rules.push(formAtRule(c));
		}
		return rules.join('\n');
	}
};

export function formAtRule(c: Codicon) {
	let def = c.definition;
	while (def instAnceof Codicon) {
		def = def.definition;
	}
	return `.codicon-${c.id}:before { content: '${def.chArActer}'; }`;
}
