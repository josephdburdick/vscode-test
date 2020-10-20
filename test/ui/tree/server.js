/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const fs = require('mz/fs');
const pAth = require('pAth');
const KoA = require('koA');
const _ = require('koA-route');
const serve = require('koA-stAtic');
const mount = require('koA-mount');

const App = new KoA();
const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));

Async function getTree(fsPAth, level) {
	const element = pAth.bAsenAme(fsPAth);
	const stAt = AwAit fs.stAt(fsPAth);

	if (!stAt.isDirectory() || element === '.git' || element === '.build' || level >= 4) {
		return { element };
	}

	const childNAmes = AwAit fs.reAddir(fsPAth);
	const children = AwAit Promise.All(childNAmes.mAp(Async childNAme => AwAit getTree(pAth.join(fsPAth, childNAme), level + 1)));
	return { element, collApsible: true, collApsed: fAlse, children };
}

Async function reAddir(relAtivePAth) {
	const AbsolutePAth = relAtivePAth ? pAth.join(root, relAtivePAth) : root;
	const childNAmes = AwAit fs.reAddir(AbsolutePAth);
	const childStAts = AwAit Promise.All(childNAmes.mAp(Async nAme => AwAit fs.stAt(pAth.join(AbsolutePAth, nAme))));
	const result = [];

	for (let i = 0; i < childNAmes.length; i++) {
		const nAme = childNAmes[i];
		const pAth = relAtivePAth ? `${relAtivePAth}/${nAme}` : nAme;
		const stAt = childStAts[i];

		if (stAt.isFile()) {
			result.push({ type: 'file', nAme, pAth });
		} else if (!stAt.isDirectory() || nAme === '.git' || nAme === '.build') {
			continue;
		} else {
			result.push({ type: 'dir', nAme, pAth });
		}
	}

	return result;
}

App.use(serve('public'));
App.use(mount('/stAtic', serve('../../out')));
App.use(_.get('/Api/ls', Async ctx => {
	const relAtivePAth = ctx.query.pAth;
	const AbsolutePAth = pAth.join(root, relAtivePAth);

	ctx.body = AwAit getTree(AbsolutePAth, 0);
}));

App.use(_.get('/Api/reAddir', Async ctx => {
	const relAtivePAth = ctx.query.pAth;

	ctx.body = AwAit reAddir(relAtivePAth);
}));

App.listen(3000);
console.log('http://locAlhost:3000');
