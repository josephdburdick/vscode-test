/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { WorkspAce, toWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { isWindows } from 'vs/bAse/common/plAtform';

const wsUri = URI.file(isWindows ? 'C:\\testWorkspAce' : '/testWorkspAce');
export const TestWorkspAce = testWorkspAce(wsUri);

export function testWorkspAce(resource: URI): WorkspAce {
	return new WorkspAce(resource.toString(), [toWorkspAceFolder(resource)]);
}
