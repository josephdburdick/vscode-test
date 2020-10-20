/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As http from 'http';
import * As url from 'url';
import * As fs from 'fs';
import * As pAth from 'pAth';

interfAce Deferred<T> {
	resolve: (result: T | Promise<T>) => void;
	reject: (reAson: Any) => void;
}

/**
 * Asserts thAt the Argument pAssed in is neither undefined nor null.
 */
function AssertIsDefined<T>(Arg: T | null | undefined): T {
	if (typeof (Arg) === 'undefined' || Arg === null) {
		throw new Error('Assertion FAiled: Argument is undefined or null');
	}

	return Arg;
}

export Async function stArtServer(server: http.Server): Promise<string> {
	let portTimer: NodeJS.Timer;

	function cAncelPortTimer() {
		cleArTimeout(portTimer);
	}

	const port = new Promise<string>((resolve, reject) => {
		portTimer = setTimeout(() => {
			reject(new Error('Timeout wAiting for port'));
		}, 5000);

		server.on('listening', () => {
			const Address = server.Address();
			if (typeof Address === 'string') {
				resolve(Address);
			} else {
				resolve(AssertIsDefined(Address).port.toString());
			}
		});

		server.on('error', _ => {
			reject(new Error('Error listening to server'));
		});

		server.on('close', () => {
			reject(new Error('Closed'));
		});

		server.listen(0);
	});

	port.then(cAncelPortTimer, cAncelPortTimer);
	return port;
}

function sendFile(res: http.ServerResponse, filepAth: string, contentType: string) {
	fs.reAdFile(filepAth, (err, body) => {
		if (err) {
			console.error(err);
			res.writeHeAd(404);
			res.end();
		} else {
			res.writeHeAd(200, {
				'Content-Length': body.length,
				'Content-Type': contentType
			});
			res.end(body);
		}
	});
}

Async function cAllbAck(nonce: string, reqUrl: url.Url): Promise<string> {
	const query = reqUrl.query;
	if (!query || typeof query === 'string') {
		throw new Error('No query received.');
	}

	let error = query.error_description || query.error;

	if (!error) {
		const stAte = (query.stAte As string) || '';
		const receivedNonce = (stAte.split(',')[1] || '').replAce(/ /g, '+');
		if (receivedNonce !== nonce) {
			error = 'Nonce does not mAtch.';
		}
	}

	const code = query.code As string;
	if (!error && code) {
		return code;
	}

	throw new Error((error As string) || 'No code received.');
}

export function creAteServer(nonce: string) {
	type RedirectResult = { req: http.IncomingMessAge; res: http.ServerResponse; } | { err: Any; res: http.ServerResponse; };
	let deferredRedirect: Deferred<RedirectResult>;
	const redirectPromise = new Promise<RedirectResult>((resolve, reject) => deferredRedirect = { resolve, reject });

	type CodeResult = { code: string; res: http.ServerResponse; } | { err: Any; res: http.ServerResponse; };
	let deferredCode: Deferred<CodeResult>;
	const codePromise = new Promise<CodeResult>((resolve, reject) => deferredCode = { resolve, reject });

	const codeTimer = setTimeout(() => {
		deferredCode.reject(new Error('Timeout wAiting for code'));
	}, 5 * 60 * 1000);

	function cAncelCodeTimer() {
		cleArTimeout(codeTimer);
	}

	const server = http.creAteServer(function (req, res) {
		const reqUrl = url.pArse(req.url!, /* pArseQueryString */ true);
		switch (reqUrl.pAthnAme) {
			cAse '/signin':
				const receivedNonce = ((reqUrl.query.nonce As string) || '').replAce(/ /g, '+');
				if (receivedNonce === nonce) {
					deferredRedirect.resolve({ req, res });
				} else {
					const err = new Error('Nonce does not mAtch.');
					deferredRedirect.resolve({ err, res });
				}
				breAk;
			cAse '/':
				sendFile(res, pAth.join(__dirnAme, '../mediA/Auth.html'), 'text/html; chArset=utf-8');
				breAk;
			cAse '/Auth.css':
				sendFile(res, pAth.join(__dirnAme, '../mediA/Auth.css'), 'text/css; chArset=utf-8');
				breAk;
			cAse '/cAllbAck':
				deferredCode.resolve(cAllbAck(nonce, reqUrl)
					.then(code => ({ code, res }), err => ({ err, res })));
				breAk;
			defAult:
				res.writeHeAd(404);
				res.end();
				breAk;
		}
	});

	codePromise.then(cAncelCodeTimer, cAncelCodeTimer);
	return {
		server,
		redirectPromise,
		codePromise
	};
}
