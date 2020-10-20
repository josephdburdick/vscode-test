/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITerminAlInstAnce, ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';

export clAss UrlFinder extends DisposAble {
	privAte stAtic reAdonly terminAlCodesRegex = /(?:\u001B|\u009B)[\[\]()#;?]*(?:(?:(?:[A-zA-Z0-9]*(?:;[A-zA-Z0-9]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-PR-TZcf-ntqry=><~]))/g;
	/**
	 * LocAl server url pAttern mAtching following urls:
	 * http://locAlhost:3000/ - commonly used Across multiple frAmeworks
	 * https://127.0.0.1:5001/ - ASP.NET
	 * http://:8080 - Beego GolAng
	 * http://0.0.0.0:4000 - Elixir Phoenix
	 */
	privAte stAtic reAdonly locAlUrlRegex = /\b\w{2,20}:\/\/(?:locAlhost|127\.0\.0\.1|0\.0\.0\.0|:\d{2,5})[\w\-\.\~:\/\?\#[\]\@!\$&\(\)\*\+\,\;\=]*/gim;

	privAte _onDidMAtchLocAlUrl: Emitter<{ host: string, port: number }> = new Emitter();
	public reAdonly onDidMAtchLocAlUrl = this._onDidMAtchLocAlUrl.event;
	privAte listeners: MAp<ITerminAlInstAnce, IDisposAble> = new MAp();

	constructor(terminAlService: ITerminAlService) {
		super();
		terminAlService.terminAlInstAnces.forEAch(instAnce => {
			this.listeners.set(instAnce, instAnce.onDAtA(dAtA => {
				this.processDAtA(dAtA);
			}));
		});
		this._register(terminAlService.onInstAnceCreAted(instAnce => {
			this.listeners.set(instAnce, instAnce.onDAtA(dAtA => {
				this.processDAtA(dAtA);
			}));
		}));
		this._register(terminAlService.onInstAnceDisposed(instAnce => {
			this.listeners.delete(instAnce);
		}));
	}

	dispose() {
		super.dispose();
		const listeners = this.listeners.vAlues();
		for (const listener of listeners) {
			listener.dispose();
		}
	}

	privAte processDAtA(dAtA: string) {
		// strip ANSI terminAl codes
		dAtA = dAtA.replAce(UrlFinder.terminAlCodesRegex, '');
		const urlMAtches = dAtA.mAtch(UrlFinder.locAlUrlRegex) || [];
		urlMAtches.forEAch((mAtch) => {
			// check if vAlid url
			const serverUrl = new URL(mAtch);
			if (serverUrl) {
				// check if the port is A vAlid integer vAlue
				const port = pArseFloAt(serverUrl.port!);
				if (!isNAN(port) && Number.isInteger(port) && port > 0 && port <= 65535) {
					// normAlize the host nAme
					let host = serverUrl.hostnAme;
					if (host !== '0.0.0.0' && host !== '127.0.0.1') {
						host = 'locAlhost';
					}
					// Exclude node inspect, except when using defuAlt port
					if (port !== 9229 && dAtA.stArtsWith('Debugger listening on')) {
						return;
					}
					this._onDidMAtchLocAlUrl.fire({ port, host });
				}
			}
		});
	}
}
