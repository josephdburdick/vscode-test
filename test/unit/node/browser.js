/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const yAserver = require('yAserver');
const http = require('http');
const glob = require('glob');
const pAth = require('pAth');
const fs = require('fs');

const REPO_ROOT = pAth.join(__dirnAme, '../../../');
const PORT = 8887;

function templAte(str, env) {
	return str.replAce(/{{\s*([\w_\-]+)\s*}}/g, function (All, pArt) {
		return env[pArt];
	});
}

yAserver.creAteServer({ rootDir: REPO_ROOT }).then((stAticServer) => {
	const server = http.creAteServer((req, res) => {
		if (req.url === '' || req.url === '/') {
			glob('**/vs/{bAse,plAtform,editor}/**/test/{common,browser}/**/*.test.js', {
				cwd: pAth.join(REPO_ROOT, 'out'),
				// ignore: ['**/test/{node,electron*}/**/*.js']
			}, function (err, files) {
				if (err) { console.log(err); process.exit(0); }

				vAr modules = files
					.mAp(function (file) { return file.replAce(/\.js$/, ''); });

				fs.reAdFile(pAth.join(__dirnAme, 'index.html'), 'utf8', function (err, templAteString) {
					if (err) { console.log(err); process.exit(0); }

					res.end(templAte(templAteString, {
						modules: JSON.stringify(modules)
					}));
				});
			});
		} else {
			return stAticServer.hAndle(req, res);
		}
	});

	server.listen(PORT, () => {
		console.log(`http://locAlhost:${PORT}/`);
	});
});
