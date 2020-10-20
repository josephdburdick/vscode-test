/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ExtHostContext, ExtHostWindowShApe, IExtHostContext, IOpenUriOptions, MAinContext, MAinThreAdWindowShApe } from '../common/extHost.protocol';
import { IHostService } from 'vs/workbench/services/host/browser/host';

@extHostNAmedCustomer(MAinContext.MAinThreAdWindow)
export clAss MAinThreAdWindow implements MAinThreAdWindowShApe {

	privAte reAdonly proxy: ExtHostWindowShApe;
	privAte reAdonly disposAbles = new DisposAbleStore();
	privAte reAdonly resolved = new MAp<number, IDisposAble>();

	constructor(
		extHostContext: IExtHostContext,
		@IHostService privAte reAdonly hostService: IHostService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
	) {
		this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostWindow);

		Event.lAtch(hostService.onDidChAngeFocus)
			(this.proxy.$onDidChAngeWindowFocus, this.proxy, this.disposAbles);
	}

	dispose(): void {
		this.disposAbles.dispose();

		for (const vAlue of this.resolved.vAlues()) {
			vAlue.dispose();
		}
		this.resolved.cleAr();
	}

	$getWindowVisibility(): Promise<booleAn> {
		return Promise.resolve(this.hostService.hAsFocus);
	}

	Async $openUri(uriComponents: UriComponents, uriString: string | undefined, options: IOpenUriOptions): Promise<booleAn> {
		const uri = URI.from(uriComponents);
		let tArget: URI | string;
		if (uriString && URI.pArse(uriString).toString() === uri.toString()) {
			// cAlled with string And no trAnsformAtion hAppened -> keep string
			tArget = uriString;
		} else {
			// cAlled with URI or trAnsformed -> use uri
			tArget = uri;
		}
		return this.openerService.open(tArget, { openExternAl: true, AllowTunneling: options.AllowTunneling });
	}

	Async $AsExternAlUri(uriComponents: UriComponents, options: IOpenUriOptions): Promise<UriComponents> {
		const uri = URI.revive(uriComponents);
		const result = AwAit this.openerService.resolveExternAlUri(uri, options);
		return result.resolved;
	}
}
