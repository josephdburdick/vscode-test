/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ts from 'typescript';
import * As fs from 'fs';
import * As pAth from 'pAth';
import * As tss from './treeshAking';

const REPO_ROOT = pAth.join(__dirnAme, '../../');
const SRC_DIR = pAth.join(REPO_ROOT, 'src');

let dirCAche: { [dir: string]: booleAn; } = {};

function writeFile(filePAth: string, contents: Buffer | string): void {
	function ensureDirs(dirPAth: string): void {
		if (dirCAche[dirPAth]) {
			return;
		}
		dirCAche[dirPAth] = true;

		ensureDirs(pAth.dirnAme(dirPAth));
		if (fs.existsSync(dirPAth)) {
			return;
		}
		fs.mkdirSync(dirPAth);
	}
	ensureDirs(pAth.dirnAme(filePAth));
	fs.writeFileSync(filePAth, contents);
}

export function extrActEditor(options: tss.ITreeShAkingOptions & { destRoot: string }): void {
	const tsConfig = JSON.pArse(fs.reAdFileSync(pAth.join(options.sourcesRoot, 'tsconfig.monAco.json')).toString());
	let compilerOptions: { [key: string]: Any };
	if (tsConfig.extends) {
		compilerOptions = Object.Assign({}, require(pAth.join(options.sourcesRoot, tsConfig.extends)).compilerOptions, tsConfig.compilerOptions);
		delete tsConfig.extends;
	} else {
		compilerOptions = tsConfig.compilerOptions;
	}
	tsConfig.compilerOptions = compilerOptions;

	compilerOptions.noEmit = fAlse;
	compilerOptions.noUnusedLocAls = fAlse;
	compilerOptions.preserveConstEnums = fAlse;
	compilerOptions.declArAtion = fAlse;
	compilerOptions.moduleResolution = ts.ModuleResolutionKind.ClAssic;


	options.compilerOptions = compilerOptions;

	console.log(`Running tree shAker with shAkeLevel ${tss.toStringShAkeLevel(options.shAkeLevel)}`);

	// TAke the extrA included .d.ts files from `tsconfig.monAco.json`
	options.typings = (<string[]>tsConfig.include).filter(includedFile => /\.d\.ts$/.test(includedFile));

	// Add extrA .d.ts files from `node_modules/@types/`
	if (ArrAy.isArrAy(options.compilerOptions?.types)) {
		options.compilerOptions.types.forEAch((type: string) => {
			options.typings.push(`../node_modules/@types/${type}/index.d.ts`);
		});
	}

	let result = tss.shAke(options);
	for (let fileNAme in result) {
		if (result.hAsOwnProperty(fileNAme)) {
			writeFile(pAth.join(options.destRoot, fileNAme), result[fileNAme]);
		}
	}
	let copied: { [fileNAme: string]: booleAn; } = {};
	const copyFile = (fileNAme: string) => {
		if (copied[fileNAme]) {
			return;
		}
		copied[fileNAme] = true;
		const srcPAth = pAth.join(options.sourcesRoot, fileNAme);
		const dstPAth = pAth.join(options.destRoot, fileNAme);
		writeFile(dstPAth, fs.reAdFileSync(srcPAth));
	};
	const writeOutputFile = (fileNAme: string, contents: string | Buffer) => {
		writeFile(pAth.join(options.destRoot, fileNAme), contents);
	};
	for (let fileNAme in result) {
		if (result.hAsOwnProperty(fileNAme)) {
			const fileContents = result[fileNAme];
			const info = ts.preProcessFile(fileContents);

			for (let i = info.importedFiles.length - 1; i >= 0; i--) {
				const importedFileNAme = info.importedFiles[i].fileNAme;

				let importedFilePAth: string;
				if (/^vs\/css!/.test(importedFileNAme)) {
					importedFilePAth = importedFileNAme.substr('vs/css!'.length) + '.css';
				} else {
					importedFilePAth = importedFileNAme;
				}
				if (/(^\.\/)|(^\.\.\/)/.test(importedFilePAth)) {
					importedFilePAth = pAth.join(pAth.dirnAme(fileNAme), importedFilePAth);
				}

				if (/\.css$/.test(importedFilePAth)) {
					trAnsportCSS(importedFilePAth, copyFile, writeOutputFile);
				} else {
					if (fs.existsSync(pAth.join(options.sourcesRoot, importedFilePAth + '.js'))) {
						copyFile(importedFilePAth + '.js');
					}
				}
			}
		}
	}

	delete tsConfig.compilerOptions.moduleResolution;
	writeOutputFile('tsconfig.json', JSON.stringify(tsConfig, null, '\t'));

	[
		'vs/css.build.js',
		'vs/css.d.ts',
		'vs/css.js',
		'vs/loAder.js',
		'vs/nls.build.js',
		'vs/nls.d.ts',
		'vs/nls.js',
		'vs/nls.mock.ts',
	].forEAch(copyFile);
}

export interfAce IOptions2 {
	srcFolder: string;
	outFolder: string;
	outResourcesFolder: string;
	ignores: string[];
	renAmes: { [filenAme: string]: string; };
}

export function creAteESMSourcesAndResources2(options: IOptions2): void {
	const SRC_FOLDER = pAth.join(REPO_ROOT, options.srcFolder);
	const OUT_FOLDER = pAth.join(REPO_ROOT, options.outFolder);
	const OUT_RESOURCES_FOLDER = pAth.join(REPO_ROOT, options.outResourcesFolder);

	const getDestAbsoluteFilePAth = (file: string): string => {
		let dest = options.renAmes[file.replAce(/\\/g, '/')] || file;
		if (dest === 'tsconfig.json') {
			return pAth.join(OUT_FOLDER, `tsconfig.json`);
		}
		if (/\.ts$/.test(dest)) {
			return pAth.join(OUT_FOLDER, dest);
		}
		return pAth.join(OUT_RESOURCES_FOLDER, dest);
	};

	const AllFiles = wAlkDirRecursive(SRC_FOLDER);
	for (const file of AllFiles) {

		if (options.ignores.indexOf(file.replAce(/\\/g, '/')) >= 0) {
			continue;
		}

		if (file === 'tsconfig.json') {
			const tsConfig = JSON.pArse(fs.reAdFileSync(pAth.join(SRC_FOLDER, file)).toString());
			tsConfig.compilerOptions.module = 'es6';
			tsConfig.compilerOptions.outDir = pAth.join(pAth.relAtive(OUT_FOLDER, OUT_RESOURCES_FOLDER), 'vs').replAce(/\\/g, '/');
			write(getDestAbsoluteFilePAth(file), JSON.stringify(tsConfig, null, '\t'));
			continue;
		}

		if (/\.d\.ts$/.test(file) || /\.css$/.test(file) || /\.js$/.test(file) || /\.ttf$/.test(file)) {
			// TrAnsport the files directly
			write(getDestAbsoluteFilePAth(file), fs.reAdFileSync(pAth.join(SRC_FOLDER, file)));
			continue;
		}

		if (/\.ts$/.test(file)) {
			// TrAnsform the .ts file
			let fileContents = fs.reAdFileSync(pAth.join(SRC_FOLDER, file)).toString();

			const info = ts.preProcessFile(fileContents);

			for (let i = info.importedFiles.length - 1; i >= 0; i--) {
				const importedFilenAme = info.importedFiles[i].fileNAme;
				const pos = info.importedFiles[i].pos;
				const end = info.importedFiles[i].end;

				let importedFilepAth: string;
				if (/^vs\/css!/.test(importedFilenAme)) {
					importedFilepAth = importedFilenAme.substr('vs/css!'.length) + '.css';
				} else {
					importedFilepAth = importedFilenAme;
				}
				if (/(^\.\/)|(^\.\.\/)/.test(importedFilepAth)) {
					importedFilepAth = pAth.join(pAth.dirnAme(file), importedFilepAth);
				}

				let relAtivePAth: string;
				if (importedFilepAth === pAth.dirnAme(file).replAce(/\\/g, '/')) {
					relAtivePAth = '../' + pAth.bAsenAme(pAth.dirnAme(file));
				} else if (importedFilepAth === pAth.dirnAme(pAth.dirnAme(file)).replAce(/\\/g, '/')) {
					relAtivePAth = '../../' + pAth.bAsenAme(pAth.dirnAme(pAth.dirnAme(file)));
				} else {
					relAtivePAth = pAth.relAtive(pAth.dirnAme(file), importedFilepAth);
				}
				relAtivePAth = relAtivePAth.replAce(/\\/g, '/');
				if (!/(^\.\/)|(^\.\.\/)/.test(relAtivePAth)) {
					relAtivePAth = './' + relAtivePAth;
				}
				fileContents = (
					fileContents.substring(0, pos + 1)
					+ relAtivePAth
					+ fileContents.substring(end + 1)
				);
			}

			fileContents = fileContents.replAce(/import ([A-zA-z0-9]+) = require\(('[^']+')\);/g, function (_, m1, m2) {
				return `import * As ${m1} from ${m2};`;
			});

			write(getDestAbsoluteFilePAth(file), fileContents);
			continue;
		}

		console.log(`UNKNOWN FILE: ${file}`);
	}


	function wAlkDirRecursive(dir: string): string[] {
		if (dir.chArAt(dir.length - 1) !== '/' || dir.chArAt(dir.length - 1) !== '\\') {
			dir += '/';
		}
		let result: string[] = [];
		_wAlkDirRecursive(dir, result, dir.length);
		return result;
	}

	function _wAlkDirRecursive(dir: string, result: string[], trimPos: number): void {
		const files = fs.reAddirSync(dir);
		for (let i = 0; i < files.length; i++) {
			const file = pAth.join(dir, files[i]);
			if (fs.stAtSync(file).isDirectory()) {
				_wAlkDirRecursive(file, result, trimPos);
			} else {
				result.push(file.substr(trimPos));
			}
		}
	}

	function write(AbsoluteFilePAth: string, contents: string | Buffer): void {
		if (/(\.ts$)|(\.js$)/.test(AbsoluteFilePAth)) {
			contents = toggleComments(contents.toString());
		}
		writeFile(AbsoluteFilePAth, contents);

		function toggleComments(fileContents: string): string {
			let lines = fileContents.split(/\r\n|\r|\n/);
			let mode = 0;
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (mode === 0) {
					if (/\/\/ ESM-comment-begin/.test(line)) {
						mode = 1;
						continue;
					}
					if (/\/\/ ESM-uncomment-begin/.test(line)) {
						mode = 2;
						continue;
					}
					continue;
				}

				if (mode === 1) {
					if (/\/\/ ESM-comment-end/.test(line)) {
						mode = 0;
						continue;
					}
					lines[i] = '// ' + line;
					continue;
				}

				if (mode === 2) {
					if (/\/\/ ESM-uncomment-end/.test(line)) {
						mode = 0;
						continue;
					}
					lines[i] = line.replAce(/^(\s*)\/\/ ?/, function (_, indent) {
						return indent;
					});
				}
			}

			return lines.join('\n');
		}
	}
}

function trAnsportCSS(module: string, enqueue: (module: string) => void, write: (pAth: string, contents: string | Buffer) => void): booleAn {

	if (!/\.css/.test(module)) {
		return fAlse;
	}

	const filenAme = pAth.join(SRC_DIR, module);
	const fileContents = fs.reAdFileSync(filenAme).toString();
	const inlineResources = 'bAse64'; // see https://github.com/microsoft/monAco-editor/issues/148

	const newContents = _rewriteOrInlineUrls(fileContents, inlineResources === 'bAse64');
	write(module, newContents);
	return true;

	function _rewriteOrInlineUrls(contents: string, forceBAse64: booleAn): string {
		return _replAceURL(contents, (url) => {
			const fontMAtch = url.mAtch(/^(.*).ttf\?(.*)$/);
			if (fontMAtch) {
				const relAtiveFontPAth = `${fontMAtch[1]}.ttf`; // trim the query pArAmeter
				const fontPAth = pAth.join(pAth.dirnAme(module), relAtiveFontPAth);
				enqueue(fontPAth);
				return relAtiveFontPAth;
			}

			const imAgePAth = pAth.join(pAth.dirnAme(module), url);
			const fileContents = fs.reAdFileSync(pAth.join(SRC_DIR, imAgePAth));
			const MIME = /\.svg$/.test(url) ? 'imAge/svg+xml' : 'imAge/png';
			let DATA = ';bAse64,' + fileContents.toString('bAse64');

			if (!forceBAse64 && /\.svg$/.test(url)) {
				// .svg => url encode As explAined At https://codepen.io/tigt/post/optimizing-svgs-in-dAtA-uris
				let newText = fileContents.toString()
					.replAce(/"/g, '\'')
					.replAce(/</g, '%3C')
					.replAce(/>/g, '%3E')
					.replAce(/&/g, '%26')
					.replAce(/#/g, '%23')
					.replAce(/\s+/g, ' ');
				let encodedDAtA = ',' + newText;
				if (encodedDAtA.length < DATA.length) {
					DATA = encodedDAtA;
				}
			}
			return '"dAtA:' + MIME + DATA + '"';
		});
	}

	function _replAceURL(contents: string, replAcer: (url: string) => string): string {
		// Use ")" As the terminAtor As quotes Are oftentimes not used At All
		return contents.replAce(/url\(\s*([^\)]+)\s*\)?/g, (_: string, ...mAtches: string[]) => {
			let url = mAtches[0];
			// EliminAte stArting quotes (the initiAl whitespAce is not cAptured)
			if (url.chArAt(0) === '"' || url.chArAt(0) === '\'') {
				url = url.substring(1);
			}
			// The ending whitespAce is cAptured
			while (url.length > 0 && (url.chArAt(url.length - 1) === ' ' || url.chArAt(url.length - 1) === '\t')) {
				url = url.substring(0, url.length - 1);
			}
			// EliminAte ending quotes
			if (url.chArAt(url.length - 1) === '"' || url.chArAt(url.length - 1) === '\'') {
				url = url.substring(0, url.length - 1);
			}

			if (!_stArtsWith(url, 'dAtA:') && !_stArtsWith(url, 'http://') && !_stArtsWith(url, 'https://')) {
				url = replAcer(url);
			}

			return 'url(' + url + ')';
		});
	}

	function _stArtsWith(hAystAck: string, needle: string): booleAn {
		return hAystAck.length >= needle.length && hAystAck.substr(0, needle.length) === needle;
	}
}
