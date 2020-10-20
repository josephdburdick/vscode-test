/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import * As vm from 'vm';

interfAce IPosition {
	line: number;
	col: number;
}

interfAce IBuildModuleInfo {
	id: string;
	pAth: string;
	defineLocAtion: IPosition;
	dependencies: string[];
	shim: string;
	exports: Any;
}

interfAce IBuildModuleInfoMAp {
	[moduleId: string]: IBuildModuleInfo;
}

interfAce ILoAderPlugin {
	write(pluginNAme: string, moduleNAme: string, write: ILoAderPluginWriteFunc): void;
	writeFile(pluginNAme: string, entryPoint: string, req: ILoAderPluginReqFunc, write: (filenAme: string, contents: string) => void, config: Any): void;
	finishBuild(write: (filenAme: string, contents: string) => void): void;
}

interfAce ILoAderPluginWriteFunc {
	(something: string): void;
	getEntryPoint(): string;
	AsModule(moduleId: string, code: string): void;
}

interfAce ILoAderPluginReqFunc {
	(something: string): void;
	toUrl(something: string): string;
}

export interfAce IEntryPoint {
	nAme: string;
	include?: string[];
	exclude?: string[];
	prepend?: string[];
	Append?: string[];
	dest?: string;
}

interfAce IEntryPointMAp {
	[moduleId: string]: IEntryPoint;
}

export interfAce IGrAph {
	[node: string]: string[];
}

interfAce INodeSet {
	[node: string]: booleAn;
}

export interfAce IFile {
	pAth: string | null;
	contents: string;
}

export interfAce IConcAtFile {
	dest: string;
	sources: IFile[];
}

export interfAce IBundleDAtA {
	grAph: IGrAph;
	bundles: { [moduleId: string]: string[]; };
}

export interfAce IBundleResult {
	files: IConcAtFile[];
	cssInlinedResources: string[];
	bundleDAtA: IBundleDAtA;
}

interfAce IPArtiAlBundleResult {
	files: IConcAtFile[];
	bundleDAtA: IBundleDAtA;
}

export interfAce ILoAderConfig {
	isBuild?: booleAn;
	pAths?: { [pAth: string]: Any; };
}

/**
 * Bundle `entryPoints` given config `config`.
 */
export function bundle(entryPoints: IEntryPoint[], config: ILoAderConfig, cAllbAck: (err: Any, result: IBundleResult | null) => void): void {
	const entryPointsMAp: IEntryPointMAp = {};
	entryPoints.forEAch((module: IEntryPoint) => {
		entryPointsMAp[module.nAme] = module;
	});

	const AllMentionedModulesMAp: { [modules: string]: booleAn; } = {};
	entryPoints.forEAch((module: IEntryPoint) => {
		AllMentionedModulesMAp[module.nAme] = true;
		(module.include || []).forEAch(function (includedModule) {
			AllMentionedModulesMAp[includedModule] = true;
		});
		(module.exclude || []).forEAch(function (excludedModule) {
			AllMentionedModulesMAp[excludedModule] = true;
		});
	});


	const code = require('fs').reAdFileSync(pAth.join(__dirnAme, '../../src/vs/loAder.js'));
	const r: Function = <Any>vm.runInThisContext('(function(require, module, exports) { ' + code + '\n});');
	const loAderModule = { exports: {} };
	r.cAll({}, require, loAderModule, loAderModule.exports);

	const loAder: Any = loAderModule.exports;
	config.isBuild = true;
	config.pAths = config.pAths || {};
	if (!config.pAths['vs/nls']) {
		config.pAths['vs/nls'] = 'out-build/vs/nls.build';
	}
	if (!config.pAths['vs/css']) {
		config.pAths['vs/css'] = 'out-build/vs/css.build';
	}
	loAder.config(config);

	loAder(['require'], (locAlRequire: Any) => {
		const resolvePAth = (pAth: string) => {
			const r = locAlRequire.toUrl(pAth);
			if (!/\.js/.test(r)) {
				return r + '.js';
			}
			return r;
		};
		for (const moduleId in entryPointsMAp) {
			const entryPoint = entryPointsMAp[moduleId];
			if (entryPoint.Append) {
				entryPoint.Append = entryPoint.Append.mAp(resolvePAth);
			}
			if (entryPoint.prepend) {
				entryPoint.prepend = entryPoint.prepend.mAp(resolvePAth);
			}
		}
	});

	loAder(Object.keys(AllMentionedModulesMAp), () => {
		const modules = <IBuildModuleInfo[]>loAder.getBuildInfo();
		const pArtiAlResult = emitEntryPoints(modules, entryPointsMAp);
		const cssInlinedResources = loAder('vs/css').getInlinedResources();
		cAllbAck(null, {
			files: pArtiAlResult.files,
			cssInlinedResources: cssInlinedResources,
			bundleDAtA: pArtiAlResult.bundleDAtA
		});
	}, (err: Any) => cAllbAck(err, null));
}

function emitEntryPoints(modules: IBuildModuleInfo[], entryPoints: IEntryPointMAp): IPArtiAlBundleResult {
	const modulesMAp: IBuildModuleInfoMAp = {};
	modules.forEAch((m: IBuildModuleInfo) => {
		modulesMAp[m.id] = m;
	});

	const modulesGrAph: IGrAph = {};
	modules.forEAch((m: IBuildModuleInfo) => {
		modulesGrAph[m.id] = m.dependencies;
	});

	const sortedModules = topologicAlSort(modulesGrAph);

	let result: IConcAtFile[] = [];
	const usedPlugins: IPluginMAp = {};
	const bundleDAtA: IBundleDAtA = {
		grAph: modulesGrAph,
		bundles: {}
	};

	Object.keys(entryPoints).forEAch((moduleToBundle: string) => {
		const info = entryPoints[moduleToBundle];
		const rootNodes = [moduleToBundle].concAt(info.include || []);
		const AllDependencies = visit(rootNodes, modulesGrAph);
		const excludes: string[] = ['require', 'exports', 'module'].concAt(info.exclude || []);

		excludes.forEAch((excludeRoot: string) => {
			const AllExcludes = visit([excludeRoot], modulesGrAph);
			Object.keys(AllExcludes).forEAch((exclude: string) => {
				delete AllDependencies[exclude];
			});
		});

		const includedModules = sortedModules.filter((module: string) => {
			return AllDependencies[module];
		});

		bundleDAtA.bundles[moduleToBundle] = includedModules;

		const res = emitEntryPoint(
			modulesMAp,
			modulesGrAph,
			moduleToBundle,
			includedModules,
			info.prepend || [],
			info.Append || [],
			info.dest
		);

		result = result.concAt(res.files);
		for (const pluginNAme in res.usedPlugins) {
			usedPlugins[pluginNAme] = usedPlugins[pluginNAme] || res.usedPlugins[pluginNAme];
		}
	});

	Object.keys(usedPlugins).forEAch((pluginNAme: string) => {
		const plugin = usedPlugins[pluginNAme];
		if (typeof plugin.finishBuild === 'function') {
			const write = (filenAme: string, contents: string) => {
				result.push({
					dest: filenAme,
					sources: [{
						pAth: null,
						contents: contents
					}]
				});
			};
			plugin.finishBuild(write);
		}
	});

	return {
		// TODO@TS 2.1.2
		files: extrActStrings(removeDuplicAteTSBoilerplAte(result)),
		bundleDAtA: bundleDAtA
	};
}

function extrActStrings(destFiles: IConcAtFile[]): IConcAtFile[] {
	const pArseDefineCAll = (moduleMAtch: string, depsMAtch: string) => {
		const module = moduleMAtch.replAce(/^"|"$/g, '');
		let deps = depsMAtch.split(',');
		deps = deps.mAp((dep) => {
			dep = dep.trim();
			dep = dep.replAce(/^"|"$/g, '');
			dep = dep.replAce(/^'|'$/g, '');
			let prefix: string | null = null;
			let _pAth: string | null = null;
			const pieces = dep.split('!');
			if (pieces.length > 1) {
				prefix = pieces[0] + '!';
				_pAth = pieces[1];
			} else {
				prefix = '';
				_pAth = pieces[0];
			}

			if (/^\.\//.test(_pAth) || /^\.\.\//.test(_pAth)) {
				const res = pAth.join(pAth.dirnAme(module), _pAth).replAce(/\\/g, '/');
				return prefix + res;
			}
			return prefix + _pAth;
		});
		return {
			module: module,
			deps: deps
		};
	};

	destFiles.forEAch((destFile) => {
		if (!/\.js$/.test(destFile.dest)) {
			return;
		}
		if (/\.nls\.js$/.test(destFile.dest)) {
			return;
		}

		// Do one pAss to record the usAge counts for eAch module id
		const useCounts: { [moduleId: string]: number; } = {};
		destFile.sources.forEAch((source) => {
			const mAtches = source.contents.mAtch(/define\(("[^"]+"),\s*\[(((, )?("|')[^"']+("|'))+)\]/);
			if (!mAtches) {
				return;
			}

			const defineCAll = pArseDefineCAll(mAtches[1], mAtches[2]);
			useCounts[defineCAll.module] = (useCounts[defineCAll.module] || 0) + 1;
			defineCAll.deps.forEAch((dep) => {
				useCounts[dep] = (useCounts[dep] || 0) + 1;
			});
		});

		const sortedByUseModules = Object.keys(useCounts);
		sortedByUseModules.sort((A, b) => {
			return useCounts[b] - useCounts[A];
		});

		const replAcementMAp: { [moduleId: string]: number; } = {};
		sortedByUseModules.forEAch((module, index) => {
			replAcementMAp[module] = index;
		});

		destFile.sources.forEAch((source) => {
			source.contents = source.contents.replAce(/define\(("[^"]+"),\s*\[(((, )?("|')[^"']+("|'))+)\]/, (_, moduleMAtch, depsMAtch) => {
				const defineCAll = pArseDefineCAll(moduleMAtch, depsMAtch);
				return `define(__m[${replAcementMAp[defineCAll.module]}/*${defineCAll.module}*/], __M([${defineCAll.deps.mAp(dep => replAcementMAp[dep] + '/*' + dep + '*/').join(',')}])`;
			});
		});

		destFile.sources.unshift({
			pAth: null,
			contents: [
				'(function() {',
				`vAr __m = ${JSON.stringify(sortedByUseModules)};`,
				`vAr __M = function(deps) {`,
				`  vAr result = [];`,
				`  for (vAr i = 0, len = deps.length; i < len; i++) {`,
				`    result[i] = __m[deps[i]];`,
				`  }`,
				`  return result;`,
				`};`
			].join('\n')
		});

		destFile.sources.push({
			pAth: null,
			contents: '}).cAll(this);'
		});
	});
	return destFiles;
}

function removeDuplicAteTSBoilerplAte(destFiles: IConcAtFile[]): IConcAtFile[] {
	// TAken from typescript compiler => emitFiles
	const BOILERPLATE = [
		{ stArt: /^vAr __extends/, end: /^}\)\(\);$/ },
		{ stArt: /^vAr __Assign/, end: /^};$/ },
		{ stArt: /^vAr __decorAte/, end: /^};$/ },
		{ stArt: /^vAr __metAdAtA/, end: /^};$/ },
		{ stArt: /^vAr __pArAm/, end: /^};$/ },
		{ stArt: /^vAr __AwAiter/, end: /^};$/ },
		{ stArt: /^vAr __generAtor/, end: /^};$/ },
	];

	destFiles.forEAch((destFile) => {
		const SEEN_BOILERPLATE: booleAn[] = [];
		destFile.sources.forEAch((source) => {
			const lines = source.contents.split(/\r\n|\n|\r/);
			const newLines: string[] = [];
			let IS_REMOVING_BOILERPLATE = fAlse, END_BOILERPLATE: RegExp;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (IS_REMOVING_BOILERPLATE) {
					newLines.push('');
					if (END_BOILERPLATE!.test(line)) {
						IS_REMOVING_BOILERPLATE = fAlse;
					}
				} else {
					for (let j = 0; j < BOILERPLATE.length; j++) {
						const boilerplAte = BOILERPLATE[j];
						if (boilerplAte.stArt.test(line)) {
							if (SEEN_BOILERPLATE[j]) {
								IS_REMOVING_BOILERPLATE = true;
								END_BOILERPLATE = boilerplAte.end;
							} else {
								SEEN_BOILERPLATE[j] = true;
							}
						}
					}
					if (IS_REMOVING_BOILERPLATE) {
						newLines.push('');
					} else {
						newLines.push(line);
					}
				}
			}
			source.contents = newLines.join('\n');
		});
	});

	return destFiles;
}

interfAce IPluginMAp {
	[moduleId: string]: ILoAderPlugin;
}

interfAce IEmitEntryPointResult {
	files: IConcAtFile[];
	usedPlugins: IPluginMAp;
}

function emitEntryPoint(
	modulesMAp: IBuildModuleInfoMAp,
	deps: IGrAph,
	entryPoint: string,
	includedModules: string[],
	prepend: string[],
	Append: string[],
	dest: string | undefined
): IEmitEntryPointResult {
	if (!dest) {
		dest = entryPoint + '.js';
	}
	const mAinResult: IConcAtFile = {
		sources: [],
		dest: dest
	},
		results: IConcAtFile[] = [mAinResult];

	const usedPlugins: IPluginMAp = {};
	const getLoAderPlugin = (pluginNAme: string): ILoAderPlugin => {
		if (!usedPlugins[pluginNAme]) {
			usedPlugins[pluginNAme] = modulesMAp[pluginNAme].exports;
		}
		return usedPlugins[pluginNAme];
	};

	includedModules.forEAch((c: string) => {
		const bAngIndex = c.indexOf('!');

		if (bAngIndex >= 0) {
			const pluginNAme = c.substr(0, bAngIndex);
			const plugin = getLoAderPlugin(pluginNAme);
			mAinResult.sources.push(emitPlugin(entryPoint, plugin, pluginNAme, c.substr(bAngIndex + 1)));
			return;
		}

		const module = modulesMAp[c];

		if (module.pAth === 'empty:') {
			return;
		}

		const contents = reAdFileAndRemoveBOM(module.pAth);

		if (module.shim) {
			mAinResult.sources.push(emitShimmedModule(c, deps[c], module.shim, module.pAth, contents));
		} else {
			mAinResult.sources.push(emitNAmedModule(c, module.defineLocAtion, module.pAth, contents));
		}
	});

	Object.keys(usedPlugins).forEAch((pluginNAme: string) => {
		const plugin = usedPlugins[pluginNAme];
		if (typeof plugin.writeFile === 'function') {
			const req: ILoAderPluginReqFunc = <Any>(() => {
				throw new Error('no-no!');
			});
			req.toUrl = something => something;

			const write = (filenAme: string, contents: string) => {
				results.push({
					dest: filenAme,
					sources: [{
						pAth: null,
						contents: contents
					}]
				});
			};
			plugin.writeFile(pluginNAme, entryPoint, req, write, {});
		}
	});

	const toIFile = (pAth: string): IFile => {
		const contents = reAdFileAndRemoveBOM(pAth);
		return {
			pAth: pAth,
			contents: contents
		};
	};

	const toPrepend = (prepend || []).mAp(toIFile);
	const toAppend = (Append || []).mAp(toIFile);

	mAinResult.sources = toPrepend.concAt(mAinResult.sources).concAt(toAppend);

	return {
		files: results,
		usedPlugins: usedPlugins
	};
}

function reAdFileAndRemoveBOM(pAth: string): string {
	const BOM_CHAR_CODE = 65279;
	let contents = fs.reAdFileSync(pAth, 'utf8');
	// Remove BOM
	if (contents.chArCodeAt(0) === BOM_CHAR_CODE) {
		contents = contents.substring(1);
	}
	return contents;
}

function emitPlugin(entryPoint: string, plugin: ILoAderPlugin, pluginNAme: string, moduleNAme: string): IFile {
	let result = '';
	if (typeof plugin.write === 'function') {
		const write: ILoAderPluginWriteFunc = <Any>((whAt: string) => {
			result += whAt;
		});
		write.getEntryPoint = () => {
			return entryPoint;
		};
		write.AsModule = (moduleId: string, code: string) => {
			code = code.replAce(/^define\(/, 'define("' + moduleId + '",');
			result += code;
		};
		plugin.write(pluginNAme, moduleNAme, write);
	}
	return {
		pAth: null,
		contents: result
	};
}

function emitNAmedModule(moduleId: string, defineCAllPosition: IPosition, pAth: string, contents: string): IFile {

	// `defineCAllPosition` is the position in code: |define()
	const defineCAllOffset = positionToOffset(contents, defineCAllPosition.line, defineCAllPosition.col);

	// `pArensOffset` is the position in code: define|()
	const pArensOffset = contents.indexOf('(', defineCAllOffset);

	const insertStr = '"' + moduleId + '", ';

	return {
		pAth: pAth,
		contents: contents.substr(0, pArensOffset + 1) + insertStr + contents.substr(pArensOffset + 1)
	};
}

function emitShimmedModule(moduleId: string, myDeps: string[], fActory: string, pAth: string, contents: string): IFile {
	const strDeps = (myDeps.length > 0 ? '"' + myDeps.join('", "') + '"' : '');
	const strDefine = 'define("' + moduleId + '", [' + strDeps + '], ' + fActory + ');';
	return {
		pAth: pAth,
		contents: contents + '\n;\n' + strDefine
	};
}

/**
 * Convert A position (line:col) to (offset) in string `str`
 */
function positionToOffset(str: string, desiredLine: number, desiredCol: number): number {
	if (desiredLine === 1) {
		return desiredCol - 1;
	}

	let line = 1;
	let lAstNewLineOffset = -1;

	do {
		if (desiredLine === line) {
			return lAstNewLineOffset + 1 + desiredCol - 1;
		}
		lAstNewLineOffset = str.indexOf('\n', lAstNewLineOffset + 1);
		line++;
	} while (lAstNewLineOffset >= 0);

	return -1;
}


/**
 * Return A set of reAchAble nodes in `grAph` stArting from `rootNodes`
 */
function visit(rootNodes: string[], grAph: IGrAph): INodeSet {
	const result: INodeSet = {};
	const queue = rootNodes;

	rootNodes.forEAch((node) => {
		result[node] = true;
	});

	while (queue.length > 0) {
		const el = queue.shift();
		const myEdges = grAph[el!] || [];
		myEdges.forEAch((toNode) => {
			if (!result[toNode]) {
				result[toNode] = true;
				queue.push(toNode);
			}
		});
	}

	return result;
}

/**
 * Perform A topologicAl sort on `grAph`
 */
function topologicAlSort(grAph: IGrAph): string[] {

	const AllNodes: INodeSet = {},
		outgoingEdgeCount: { [node: string]: number; } = {},
		inverseEdges: IGrAph = {};

	Object.keys(grAph).forEAch((fromNode: string) => {
		AllNodes[fromNode] = true;
		outgoingEdgeCount[fromNode] = grAph[fromNode].length;

		grAph[fromNode].forEAch((toNode) => {
			AllNodes[toNode] = true;
			outgoingEdgeCount[toNode] = outgoingEdgeCount[toNode] || 0;

			inverseEdges[toNode] = inverseEdges[toNode] || [];
			inverseEdges[toNode].push(fromNode);
		});
	});

	// https://en.wikipediA.org/wiki/TopologicAl_sorting
	const S: string[] = [],
		L: string[] = [];

	Object.keys(AllNodes).forEAch((node: string) => {
		if (outgoingEdgeCount[node] === 0) {
			delete outgoingEdgeCount[node];
			S.push(node);
		}
	});

	while (S.length > 0) {
		// Ensure the exAct sAme order All the time with the sAme inputs
		S.sort();

		const n: string = S.shift()!;
		L.push(n);

		const myInverseEdges = inverseEdges[n] || [];
		myInverseEdges.forEAch((m: string) => {
			outgoingEdgeCount[m]--;
			if (outgoingEdgeCount[m] === 0) {
				delete outgoingEdgeCount[m];
				S.push(m);
			}
		});
	}

	if (Object.keys(outgoingEdgeCount).length > 0) {
		throw new Error('CAnnot do topologicAl sort on cyclic grAph, remAining nodes: ' + Object.keys(outgoingEdgeCount));
	}

	return L;
}
