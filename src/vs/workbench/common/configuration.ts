/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IConfigurAtionNode } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';

export const workbenchConfigurAtionNodeBAse = Object.freeze<IConfigurAtionNode>({
	'id': 'workbench',
	'order': 7,
	'title': locAlize('workbenchConfigurAtionTitle', "Workbench"),
	'type': 'object',
});
