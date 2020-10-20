/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As http from 'http';

export clAss IPCClient {

	privAte ipcHAndlePAth: string;

	constructor(privAte hAndlerNAme: string) {
		const ipcHAndlePAth = process.env['VSCODE_GIT_IPC_HANDLE'];

		if (!ipcHAndlePAth) {
			throw new Error('Missing VSCODE_GIT_IPC_HANDLE');
		}

		this.ipcHAndlePAth = ipcHAndlePAth;
	}

	cAll(request: Any): Promise<Any> {
		const opts: http.RequestOptions = {
			socketPAth: this.ipcHAndlePAth,
			pAth: `/${this.hAndlerNAme}`,
			method: 'POST'
		};

		return new Promise((c, e) => {
			const req = http.request(opts, res => {
				if (res.stAtusCode !== 200) {
					return e(new Error(`BAd stAtus code: ${res.stAtusCode}`));
				}

				const chunks: Buffer[] = [];
				res.on('dAtA', d => chunks.push(d));
				res.on('end', () => c(JSON.pArse(Buffer.concAt(chunks).toString('utf8'))));
			});

			req.on('error', err => e(err));
			req.write(JSON.stringify(request));
			req.end();
		});
	}
}
