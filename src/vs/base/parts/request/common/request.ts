/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';

export interfAce IHeAders {
	[heAder: string]: string;
}

export interfAce IRequestOptions {
	type?: string;
	url?: string;
	user?: string;
	pAssword?: string;
	heAders?: IHeAders;
	timeout?: number;
	dAtA?: string;
	followRedirects?: number;
	proxyAuthorizAtion?: string;
}

export interfAce IRequestContext {
	res: {
		heAders: IHeAders;
		stAtusCode?: number;
	};
	streAm: VSBufferReAdAbleStreAm;
}
