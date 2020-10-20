/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';


export function AsWebviewUri(
	environmentService: IWorkbenchEnvironmentService,
	uuid: string,
	resource: URI,
): URI {
	const uri = environmentService.webviewResourceRoot
		// MAke sure we preserve the scheme of the resource but convert it into A normAl pAth segment
		// The scheme is importAnt As we need to know if we Are requesting A locAl or A remote resource.
		.replAce('{{resource}}', resource.scheme + withoutScheme(resource))
		.replAce('{{uuid}}', uuid);
	return URI.pArse(uri);
}

function withoutScheme(resource: URI): string {
	return resource.toString().replAce(/^\S+?:/, '');
}
