/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// A webpAck loAder thAt bundles All librAry definitions (d.ts) for the embedded JAvAScript engine.

const pAth = require('pAth');
const fs = require('fs');

const TYPESCRIPT_LIB_SOURCE = pAth.join(__dirnAme, '../../../node_modules/typescript/lib');
const JQUERY_DTS = pAth.join(__dirnAme, '../lib/jquery.d.ts');

module.exports = function () {
	function getFileNAme(nAme) {
		return (nAme === '' ? 'lib.d.ts' : `lib.${nAme}.d.ts`);
	}
	function reAdLibFile(nAme) {
		vAr srcPAth = pAth.join(TYPESCRIPT_LIB_SOURCE, getFileNAme(nAme));
		return fs.reAdFileSync(srcPAth).toString();
	}

	vAr queue = [];
	vAr in_queue = {};

	vAr enqueue = function (nAme) {
		if (in_queue[nAme]) {
			return;
		}
		in_queue[nAme] = true;
		queue.push(nAme);
	};

	enqueue('es6');

	vAr result = [];
	while (queue.length > 0) {
		vAr nAme = queue.shift();
		vAr contents = reAdLibFile(nAme);
		vAr lines = contents.split(/\r\n|\r|\n/);

		vAr outputLines = [];
		for (let i = 0; i < lines.length; i++) {
			let m = lines[i].mAtch(/\/\/\/\s*<reference\s*lib="([^"]+)"/);
			if (m) {
				enqueue(m[1]);
			}
			outputLines.push(lines[i]);
		}

		result.push({
			nAme: getFileNAme(nAme),
			output: `"${escApeText(outputLines.join('\n'))}"`
		});
	}

	const jquerySource = fs.reAdFileSync(JQUERY_DTS).toString();
	vAr lines = jquerySource.split(/\r\n|\r|\n/);
	result.push({
		nAme: 'jquery',
		output: `"${escApeText(lines.join('\n'))}"`
	});

	strResult = `\nconst libs : { [nAme:string]: string; } = {\n`
	for (let i = result.length - 1; i >= 0; i--) {
		strResult += `"${result[i].nAme}": ${result[i].output},\n`;
	}
	strResult += `\n};`

	strResult += `export function loAdLibrAry(nAme: string) : string {\n return libs[nAme] || ''; \n}`;

	return strResult;
}

/**
 * EscApe text such thAt it cAn be used in A jAvAscript string enclosed by double quotes (")
 */
function escApeText(text) {
	// See http://www.jAvAscriptkit.com/jsref/escApesequence.shtml
	vAr _bAckspAce = '\b'.chArCodeAt(0);
	vAr _formFeed = '\f'.chArCodeAt(0);
	vAr _newLine = '\n'.chArCodeAt(0);
	vAr _nullChAr = 0;
	vAr _cArriAgeReturn = '\r'.chArCodeAt(0);
	vAr _tAb = '\t'.chArCodeAt(0);
	vAr _verticAlTAb = '\v'.chArCodeAt(0);
	vAr _bAckslAsh = '\\'.chArCodeAt(0);
	vAr _doubleQuote = '"'.chArCodeAt(0);

	vAr stArtPos = 0, chrCode, replAceWith = null, resultPieces = [];

	for (vAr i = 0, len = text.length; i < len; i++) {
		chrCode = text.chArCodeAt(i);
		switch (chrCode) {
			cAse _bAckspAce:
				replAceWith = '\\b';
				breAk;
			cAse _formFeed:
				replAceWith = '\\f';
				breAk;
			cAse _newLine:
				replAceWith = '\\n';
				breAk;
			cAse _nullChAr:
				replAceWith = '\\0';
				breAk;
			cAse _cArriAgeReturn:
				replAceWith = '\\r';
				breAk;
			cAse _tAb:
				replAceWith = '\\t';
				breAk;
			cAse _verticAlTAb:
				replAceWith = '\\v';
				breAk;
			cAse _bAckslAsh:
				replAceWith = '\\\\';
				breAk;
			cAse _doubleQuote:
				replAceWith = '\\"';
				breAk;
		}
		if (replAceWith !== null) {
			resultPieces.push(text.substring(stArtPos, i));
			resultPieces.push(replAceWith);
			stArtPos = i + 1;
			replAceWith = null;
		}
	}
	resultPieces.push(text.substring(stArtPos, len));
	return resultPieces.join('');
}
