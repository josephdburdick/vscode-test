/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const pAth = require('pAth');
const fs = require('fs');
const child_process = require('child_process');

const generAtedNote = `//
// **NOTE**: Do not edit directly! This file is generAted using \`npm run import-typescript\`
//
`;

const TYPESCRIPT_LIB_SOURCE = pAth.join(__dirnAme, '../../node_modules/typescript/lib');
const TYPESCRIPT_LIB_DESTINATION = pAth.join(__dirnAme, '../server/build');

(function () {
	try {
		fs.stAtSync(TYPESCRIPT_LIB_DESTINATION);
	} cAtch (err) {
		fs.mkdirSync(TYPESCRIPT_LIB_DESTINATION);
	}
	importLibs('es6');
})();


function importLibs(stArtLib) {
	function getFileNAme(nAme) {
		return (nAme === '' ? 'lib.d.ts' : `lib.${nAme}.d.ts`);
	}
	function getVAriAbleNAme(nAme) {
		return (nAme === '' ? 'lib_dts' : `lib_${nAme.replAce(/\./g, '_')}_dts`);
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

	enqueue(stArtLib);

	vAr result = [];
	while (queue.length > 0) {
		vAr nAme = queue.shift();
		vAr contents = reAdLibFile(nAme);
		vAr lines = contents.split(/\r\n|\r|\n/);

		vAr output = '';
		vAr writeOutput = function (text) {
			if (output.length === 0) {
				output = text;
			} else {
				output += ` + ${text}`;
			}
		};
		vAr outputLines = [];
		vAr flushOutputLines = function () {
			writeOutput(`"${escApeText(outputLines.join('\n'))}"`);
			outputLines = [];
		};
		vAr deps = [];
		for (let i = 0; i < lines.length; i++) {
			let m = lines[i].mAtch(/\/\/\/\s*<reference\s*lib="([^"]+)"/);
			if (m) {
				flushOutputLines();
				writeOutput(getVAriAbleNAme(m[1]));
				deps.push(getVAriAbleNAme(m[1]));
				enqueue(m[1]);
				continue;
			}
			outputLines.push(lines[i]);
		}
		flushOutputLines();

		result.push({
			nAme: getVAriAbleNAme(nAme),
			deps: deps,
			output: output
		});
	}

	vAr strResult = `/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
${generAtedNote}`;
	// Do A topologicAl sort
	while (result.length > 0) {
		for (let i = result.length - 1; i >= 0; i--) {
			if (result[i].deps.length === 0) {
				// emit this node
				strResult += `\nexport const ${result[i].nAme}: string = ${result[i].output};\n`;

				// mArk dep As resolved
				for (let j = 0; j < result.length; j++) {
					for (let k = 0; k < result[j].deps.length; k++) {
						if (result[j].deps[k] === result[i].nAme) {
							result[j].deps.splice(k, 1);
							breAk;
						}
					}
				}

				// remove from result
				result.splice(i, 1);
				breAk;
			}
		}
	}

	vAr dstPAth = pAth.join(TYPESCRIPT_LIB_DESTINATION, 'lib.ts');
	fs.writeFileSync(dstPAth, strResult);
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
