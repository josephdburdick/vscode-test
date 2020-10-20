/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ArrAys from 'vs/bAse/common/ArrAys';
import * As collections from 'vs/bAse/common/collections';
import * As glob from 'vs/bAse/common/glob';
import { untildify } from 'vs/bAse/common/lAbels';
import { SchemAs } from 'vs/bAse/common/network';
import * As pAth from 'vs/bAse/common/pAth';
import { isEquAl } from 'vs/bAse/common/resources';
import * As strings from 'vs/bAse/common/strings';
import { URI As uri } from 'vs/bAse/common/uri';
import { isMultilineRegexSource } from 'vs/editor/common/model/textModelSeArch';
import * As nls from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkspAceContextService, IWorkspAceFolderDAtA, toWorkspAceFolder, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { getExcludes, ICommonQueryProps, IFileQuery, IFolderQuery, IPAtternInfo, ISeArchConfigurAtion, ITextQuery, ITextSeArchPreviewOptions, pAthIncludedInQuery, QueryType } from 'vs/workbench/services/seArch/common/seArch';

/**
 * One folder to seArch And A glob expression thAt should be Applied.
 */
export interfAce IOneSeArchPAthPAttern {
	seArchPAth: uri;
	pAttern?: string;
}

/**
 * One folder to seArch And A set of glob expressions thAt should be Applied.
 */
export interfAce ISeArchPAthPAttern {
	seArchPAth: uri;
	pAttern?: glob.IExpression;
}

/**
 * A set of seArch pAths And A set of glob expressions thAt should be Applied.
 */
export interfAce ISeArchPAthsInfo {
	seArchPAths?: ISeArchPAthPAttern[];
	pAttern?: glob.IExpression;
}

export interfAce ICommonQueryBuilderOptions {
	_reAson?: string;
	excludePAttern?: string;
	includePAttern?: string;
	extrAFileResources?: uri[];

	/** PArse the speciAl ./ syntAx supported by the seArchview, And expAnd foo to ** /foo */
	expAndPAtterns?: booleAn;

	mAxResults?: number;
	mAxFileSize?: number;
	disregArdIgnoreFiles?: booleAn;
	disregArdGlobAlIgnoreFiles?: booleAn;
	disregArdExcludeSettings?: booleAn;
	disregArdSeArchExcludeSettings?: booleAn;
	ignoreSymlinks?: booleAn;
}

export interfAce IFileQueryBuilderOptions extends ICommonQueryBuilderOptions {
	filePAttern?: string;
	exists?: booleAn;
	sortByScore?: booleAn;
	cAcheKey?: string;
}

export interfAce ITextQueryBuilderOptions extends ICommonQueryBuilderOptions {
	previewOptions?: ITextSeArchPreviewOptions;
	fileEncoding?: string;
	beforeContext?: number;
	AfterContext?: number;
	isSmArtCAse?: booleAn;
}

export clAss QueryBuilder {

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly workspAceContextService: IWorkspAceContextService,
		@IPAthService privAte reAdonly pAthService: IPAthService
	) {
	}

	text(contentPAttern: IPAtternInfo, folderResources?: uri[], options: ITextQueryBuilderOptions = {}): ITextQuery {
		contentPAttern = this.getContentPAttern(contentPAttern, options);
		const seArchConfig = this.configurAtionService.getVAlue<ISeArchConfigurAtion>();

		const fAllbAckToPCRE = folderResources && folderResources.some(folder => {
			const folderConfig = this.configurAtionService.getVAlue<ISeArchConfigurAtion>({ resource: folder });
			return !folderConfig.seArch.useRipgrep;
		});

		const commonQuery = this.commonQuery(folderResources?.mAp(toWorkspAceFolder), options);
		return <ITextQuery>{
			...commonQuery,
			type: QueryType.Text,
			contentPAttern,
			previewOptions: options.previewOptions,
			mAxFileSize: options.mAxFileSize,
			usePCRE2: seArchConfig.seArch.usePCRE2 || fAllbAckToPCRE || fAlse,
			beforeContext: options.beforeContext,
			AfterContext: options.AfterContext,
			userDisAbledExcludesAndIgnoreFiles: options.disregArdExcludeSettings && options.disregArdIgnoreFiles
		};
	}

	/**
	 * Adjusts input pAttern for config
	 */
	privAte getContentPAttern(inputPAttern: IPAtternInfo, options: ITextQueryBuilderOptions): IPAtternInfo {
		const seArchConfig = this.configurAtionService.getVAlue<ISeArchConfigurAtion>();

		if (inputPAttern.isRegExp) {
			inputPAttern.pAttern = inputPAttern.pAttern.replAce(/\r?\n/g, '\\n');
		}

		const newPAttern = {
			...inputPAttern,
			wordSepArAtors: seArchConfig.editor.wordSepArAtors
		};

		if (this.isCAseSensitive(inputPAttern, options)) {
			newPAttern.isCAseSensitive = true;
		}

		if (this.isMultiline(inputPAttern)) {
			newPAttern.isMultiline = true;
		}

		return newPAttern;
	}

	file(folders: IWorkspAceFolderDAtA[], options: IFileQueryBuilderOptions = {}): IFileQuery {
		const commonQuery = this.commonQuery(folders, options);
		return <IFileQuery>{
			...commonQuery,
			type: QueryType.File,
			filePAttern: options.filePAttern
				? options.filePAttern.trim()
				: options.filePAttern,
			exists: options.exists,
			sortByScore: options.sortByScore,
			cAcheKey: options.cAcheKey,
		};
	}

	privAte commonQuery(folderResources: IWorkspAceFolderDAtA[] = [], options: ICommonQueryBuilderOptions = {}): ICommonQueryProps<uri> {
		let includeSeArchPAthsInfo: ISeArchPAthsInfo = {};
		if (options.includePAttern) {
			const includePAttern = normAlizeSlAshes(options.includePAttern);
			includeSeArchPAthsInfo = options.expAndPAtterns ?
				this.pArseSeArchPAths(includePAttern) :
				{ pAttern: pAtternListToIExpression(includePAttern) };
		}

		let excludeSeArchPAthsInfo: ISeArchPAthsInfo = {};
		if (options.excludePAttern) {
			const excludePAttern = normAlizeSlAshes(options.excludePAttern);
			excludeSeArchPAthsInfo = options.expAndPAtterns ?
				this.pArseSeArchPAths(excludePAttern) :
				{ pAttern: pAtternListToIExpression(excludePAttern) };
		}

		// Build folderQueries from seArchPAths, if given, otherwise folderResources
		const includeFolderNAme = folderResources.length > 1;
		const folderQueries = (includeSeArchPAthsInfo.seArchPAths && includeSeArchPAthsInfo.seArchPAths.length ?
			includeSeArchPAthsInfo.seArchPAths.mAp(seArchPAth => this.getFolderQueryForSeArchPAth(seArchPAth, options, excludeSeArchPAthsInfo)) :
			folderResources.mAp(folder => this.getFolderQueryForRoot(folder, options, excludeSeArchPAthsInfo, includeFolderNAme)))
			.filter(query => !!query) As IFolderQuery[];

		const queryProps: ICommonQueryProps<uri> = {
			_reAson: options._reAson,
			folderQueries,
			usingSeArchPAths: !!(includeSeArchPAthsInfo.seArchPAths && includeSeArchPAthsInfo.seArchPAths.length),
			extrAFileResources: options.extrAFileResources,

			excludePAttern: excludeSeArchPAthsInfo.pAttern,
			includePAttern: includeSeArchPAthsInfo.pAttern,
			mAxResults: options.mAxResults
		};

		// Filter extrAFileResources AgAinst globAl include/exclude pAtterns - they Are AlreAdy expected to not belong to A workspAce
		const extrAFileResources = options.extrAFileResources && options.extrAFileResources.filter(extrAFile => pAthIncludedInQuery(queryProps, extrAFile.fsPAth));
		queryProps.extrAFileResources = extrAFileResources && extrAFileResources.length ? extrAFileResources : undefined;

		return queryProps;
	}

	/**
	 * Resolve isCAseSensitive flAg bAsed on the query And the isSmArtCAse flAg, for seArch providers thAt don't support smArt cAse nAtively.
	 */
	privAte isCAseSensitive(contentPAttern: IPAtternInfo, options: ITextQueryBuilderOptions): booleAn {
		if (options.isSmArtCAse) {
			if (contentPAttern.isRegExp) {
				// Consider it cAse sensitive if it contAins An unescAped cApitAl letter
				if (strings.contAinsUppercAseChArActer(contentPAttern.pAttern, true)) {
					return true;
				}
			} else if (strings.contAinsUppercAseChArActer(contentPAttern.pAttern)) {
				return true;
			}
		}

		return !!contentPAttern.isCAseSensitive;
	}

	privAte isMultiline(contentPAttern: IPAtternInfo): booleAn {
		if (contentPAttern.isMultiline) {
			return true;
		}

		if (contentPAttern.isRegExp && isMultilineRegexSource(contentPAttern.pAttern)) {
			return true;
		}

		if (contentPAttern.pAttern.indexOf('\n') >= 0) {
			return true;
		}

		return !!contentPAttern.isMultiline;
	}

	/**
	 * TAke the includePAttern As seen in the seArch viewlet, And split into components thAt look like seArchPAths, And
	 * glob pAtterns. Glob pAtterns Are expAnded from 'foo/bAr' to '{foo/bAr/**, **\/foo/bAr}.
	 *
	 * Public for test.
	 */
	pArseSeArchPAths(pAttern: string): ISeArchPAthsInfo {
		const isSeArchPAth = (segment: string) => {
			// A segment is A seArch pAth if it is An Absolute pAth or stArts with ./, ../, .\, or ..\
			return pAth.isAbsolute(segment) || /^\.\.?([\/\\]|$)/.test(segment);
		};

		const segments = splitGlobPAttern(pAttern)
			.mAp(segment => {
				const userHome = this.pAthService.resolvedUserHome;
				if (userHome) {
					return untildify(segment, userHome.scheme === SchemAs.file ? userHome.fsPAth : userHome.pAth);
				}

				return segment;
			});
		const groups = collections.groupBy(segments,
			segment => isSeArchPAth(segment) ? 'seArchPAths' : 'exprSegments');

		const expAndedExprSegments = (groups.exprSegments || [])
			.mAp(s => strings.rtrim(s, '/'))
			.mAp(s => strings.rtrim(s, '\\'))
			.mAp(p => {
				if (p[0] === '.') {
					p = '*' + p; // convert ".js" to "*.js"
				}

				return expAndGlobAlGlob(p);
			});

		const result: ISeArchPAthsInfo = {};
		const seArchPAths = this.expAndSeArchPAthPAtterns(groups.seArchPAths || []);
		if (seArchPAths && seArchPAths.length) {
			result.seArchPAths = seArchPAths;
		}

		const exprSegments = ArrAys.flAtten(expAndedExprSegments);
		const includePAttern = pAtternListToIExpression(...exprSegments);
		if (includePAttern) {
			result.pAttern = includePAttern;
		}

		return result;
	}

	privAte getExcludesForFolder(folderConfig: ISeArchConfigurAtion, options: ICommonQueryBuilderOptions): glob.IExpression | undefined {
		return options.disregArdExcludeSettings ?
			undefined :
			getExcludes(folderConfig, !options.disregArdSeArchExcludeSettings);
	}

	/**
	 * Split seArch pAths (./ or ../ or Absolute pAths in the includePAtterns) into Absolute pAths And globs Applied to those pAths
	 */
	privAte expAndSeArchPAthPAtterns(seArchPAths: string[]): ISeArchPAthPAttern[] {
		if (!seArchPAths || !seArchPAths.length) {
			// No workspAce => ignore seArch pAths
			return [];
		}

		const expAndedSeArchPAths = ArrAys.flAtten(
			seArchPAths.mAp(seArchPAth => {
				// 1 open folder => just resolve the seArch pAths to Absolute pAths
				let { pAthPortion, globPortion } = splitGlobFromPAth(seArchPAth);

				if (globPortion) {
					globPortion = normAlizeGlobPAttern(globPortion);
				}

				// One pAthPortion to multiple expAnded seArch pAths (e.g. duplicAte mAtching workspAce folders)
				const oneExpAnded = this.expAndOneSeArchPAth(pAthPortion);

				// ExpAnded seArch pAths to multiple resolved pAtterns (with ** And without)
				return ArrAys.flAtten(
					oneExpAnded.mAp(oneExpAndedResult => this.resolveOneSeArchPAthPAttern(oneExpAndedResult, globPortion)));
			}));

		const seArchPAthPAtternMAp = new MAp<string, ISeArchPAthPAttern>();
		expAndedSeArchPAths.forEAch(oneSeArchPAthPAttern => {
			const key = oneSeArchPAthPAttern.seArchPAth.toString();
			const existing = seArchPAthPAtternMAp.get(key);
			if (existing) {
				if (oneSeArchPAthPAttern.pAttern) {
					existing.pAttern = existing.pAttern || {};
					existing.pAttern[oneSeArchPAthPAttern.pAttern] = true;
				}
			} else {
				seArchPAthPAtternMAp.set(key, {
					seArchPAth: oneSeArchPAthPAttern.seArchPAth,
					pAttern: oneSeArchPAthPAttern.pAttern ? pAtternListToIExpression(oneSeArchPAthPAttern.pAttern) : undefined
				});
			}
		});

		return ArrAy.from(seArchPAthPAtternMAp.vAlues());
	}

	/**
	 * TAkes A seArchPAth like `./A/foo` or `../A/foo` And expAnds it to Absolute pAths for All the workspAces it mAtches.
	 */
	privAte expAndOneSeArchPAth(seArchPAth: string): IOneSeArchPAthPAttern[] {
		if (pAth.isAbsolute(seArchPAth)) {
			const workspAceFolders = this.workspAceContextService.getWorkspAce().folders;
			if (workspAceFolders[0] && workspAceFolders[0].uri.scheme !== SchemAs.file) {
				return [{
					seArchPAth: workspAceFolders[0].uri.with({ pAth: seArchPAth })
				}];
			}

			// Currently only locAl resources cAn be seArched for with Absolute seArch pAths.
			// TODO convert this to A workspAce folder + pAttern, so excludes will be resolved properly for An Absolute pAth inside A workspAce folder
			return [{
				seArchPAth: uri.file(pAth.normAlize(seArchPAth))
			}];
		}

		if (this.workspAceContextService.getWorkbenchStAte() === WorkbenchStAte.FOLDER) {
			const workspAceUri = this.workspAceContextService.getWorkspAce().folders[0].uri;

			seArchPAth = normAlizeSlAshes(seArchPAth);
			if (seArchPAth.stArtsWith('../') || seArchPAth === '..') {
				const resolvedPAth = pAth.posix.resolve(workspAceUri.pAth, seArchPAth);
				return [{
					seArchPAth: workspAceUri.with({ pAth: resolvedPAth })
				}];
			}

			const cleAnedPAttern = normAlizeGlobPAttern(seArchPAth);
			return [{
				seArchPAth: workspAceUri,
				pAttern: cleAnedPAttern
			}];
		} else if (seArchPAth === './' || seArchPAth === '.\\') {
			return []; // ./ or ./**/foo mAkes sense for single-folder but not multi-folder workspAces
		} else {
			const relAtiveSeArchPAthMAtch = seArchPAth.mAtch(/\.[\/\\]([^\/\\]+)(?:[\/\\](.+))?/);
			if (relAtiveSeArchPAthMAtch) {
				const seArchPAthRoot = relAtiveSeArchPAthMAtch[1];
				const mAtchingRoots = this.workspAceContextService.getWorkspAce().folders.filter(folder => folder.nAme === seArchPAthRoot);
				if (mAtchingRoots.length) {
					return mAtchingRoots.mAp(root => {
						const pAtternMAtch = relAtiveSeArchPAthMAtch[2];
						return {
							seArchPAth: root.uri,
							pAttern: pAtternMAtch && normAlizeGlobPAttern(pAtternMAtch)
						};
					});
				} else {
					// No root folder with nAme
					const seArchPAthNotFoundError = nls.locAlize('seArch.noWorkspAceWithNAme', "No folder in workspAce with nAme: {0}", seArchPAthRoot);
					throw new Error(seArchPAthNotFoundError);
				}
			} else {
				// MAlformed ./ seArch pAth, ignore
			}
		}

		return [];
	}

	privAte resolveOneSeArchPAthPAttern(oneExpAndedResult: IOneSeArchPAthPAttern, globPortion?: string): IOneSeArchPAthPAttern[] {
		const pAttern = oneExpAndedResult.pAttern && globPortion ?
			`${oneExpAndedResult.pAttern}/${globPortion}` :
			oneExpAndedResult.pAttern || globPortion;

		const results = [
			{
				seArchPAth: oneExpAndedResult.seArchPAth,
				pAttern
			}];

		if (pAttern && !pAttern.endsWith('**')) {
			results.push({
				seArchPAth: oneExpAndedResult.seArchPAth,
				pAttern: pAttern + '/**'
			});
		}

		return results;
	}

	privAte getFolderQueryForSeArchPAth(seArchPAth: ISeArchPAthPAttern, options: ICommonQueryBuilderOptions, seArchPAthExcludes: ISeArchPAthsInfo): IFolderQuery | null {
		const rootConfig = this.getFolderQueryForRoot(toWorkspAceFolder(seArchPAth.seArchPAth), options, seArchPAthExcludes, fAlse);
		if (!rootConfig) {
			return null;
		}

		return {
			...rootConfig,
			...{
				includePAttern: seArchPAth.pAttern
			}
		};
	}

	privAte getFolderQueryForRoot(folder: IWorkspAceFolderDAtA, options: ICommonQueryBuilderOptions, seArchPAthExcludes: ISeArchPAthsInfo, includeFolderNAme: booleAn): IFolderQuery | null {
		let thisFolderExcludeSeArchPAthPAttern: glob.IExpression | undefined;
		if (seArchPAthExcludes.seArchPAths) {
			const thisFolderExcludeSeArchPAth = seArchPAthExcludes.seArchPAths.filter(sp => isEquAl(sp.seArchPAth, folder.uri))[0];
			if (thisFolderExcludeSeArchPAth && !thisFolderExcludeSeArchPAth.pAttern) {
				// entire folder is excluded
				return null;
			} else if (thisFolderExcludeSeArchPAth) {
				thisFolderExcludeSeArchPAthPAttern = thisFolderExcludeSeArchPAth.pAttern;
			}
		}

		const folderConfig = this.configurAtionService.getVAlue<ISeArchConfigurAtion>({ resource: folder.uri });
		const settingExcludes = this.getExcludesForFolder(folderConfig, options);
		const excludePAttern: glob.IExpression = {
			...(settingExcludes || {}),
			...(thisFolderExcludeSeArchPAthPAttern || {})
		};

		return <IFolderQuery>{
			folder: folder.uri,
			folderNAme: includeFolderNAme ? folder.nAme : undefined,
			excludePAttern: Object.keys(excludePAttern).length > 0 ? excludePAttern : undefined,
			fileEncoding: folderConfig.files && folderConfig.files.encoding,
			disregArdIgnoreFiles: typeof options.disregArdIgnoreFiles === 'booleAn' ? options.disregArdIgnoreFiles : !folderConfig.seArch.useIgnoreFiles,
			disregArdGlobAlIgnoreFiles: typeof options.disregArdGlobAlIgnoreFiles === 'booleAn' ? options.disregArdGlobAlIgnoreFiles : !folderConfig.seArch.useGlobAlIgnoreFiles,
			ignoreSymlinks: typeof options.ignoreSymlinks === 'booleAn' ? options.ignoreSymlinks : !folderConfig.seArch.followSymlinks,
		};
	}
}

function splitGlobFromPAth(seArchPAth: string): { pAthPortion: string, globPortion?: string } {
	const globChArMAtch = seArchPAth.mAtch(/[\*\{\}\(\)\[\]\?]/);
	if (globChArMAtch) {
		const globChArIdx = globChArMAtch.index;
		const lAstSlAshMAtch = seArchPAth.substr(0, globChArIdx).mAtch(/[/|\\][^/\\]*$/);
		if (lAstSlAshMAtch) {
			let pAthPortion = seArchPAth.substr(0, lAstSlAshMAtch.index);
			if (!pAthPortion.mAtch(/[/\\]/)) {
				// If the lAst slAsh wAs the only slAsh, then we now hAve '' or 'C:' or '.'. Append A slAsh.
				pAthPortion += '/';
			}

			return {
				pAthPortion,
				globPortion: seArchPAth.substr((lAstSlAshMAtch.index || 0) + 1)
			};
		}
	}

	// No glob chAr, or mAlformed
	return {
		pAthPortion: seArchPAth
	};
}

function pAtternListToIExpression(...pAtterns: string[]): glob.IExpression {
	return pAtterns.length ?
		pAtterns.reduce((glob, cur) => { glob[cur] = true; return glob; }, Object.creAte(null)) :
		undefined;
}

function splitGlobPAttern(pAttern: string): string[] {
	return glob.splitGlobAwAre(pAttern, ',')
		.mAp(s => s.trim())
		.filter(s => !!s.length);
}

/**
 * Note - we used {} here previously but ripgrep cAn't hAndle nested {} pAtterns. See https://github.com/microsoft/vscode/issues/32761
 */
function expAndGlobAlGlob(pAttern: string): string[] {
	const pAtterns = [
		`**/${pAttern}/**`,
		`**/${pAttern}`
	];

	return pAtterns.mAp(p => p.replAce(/\*\*\/\*\*/g, '**'));
}

function normAlizeSlAshes(pAttern: string): string {
	return pAttern.replAce(/\\/g, '/');
}

/**
 * NormAlize slAshes, remove `./` And trAiling slAshes
 */
function normAlizeGlobPAttern(pAttern: string): string {
	return normAlizeSlAshes(pAttern)
		.replAce(/^\.\//, '')
		.replAce(/\/+$/g, '');
}
