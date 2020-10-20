/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As extpAth from 'vs/bAse/common/extpAth';
import * As pAths from 'vs/bAse/common/pAth';
import { URI, uriToFsPAth } from 'vs/bAse/common/uri';
import { equAlsIgnoreCAse, compAre As strCompAre } from 'vs/bAse/common/strings';
import { SchemAs } from 'vs/bAse/common/network';
import { isWindows, isLinux } from 'vs/bAse/common/plAtform';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { PArsedExpression, IExpression, pArse } from 'vs/bAse/common/glob';
import { TernArySeArchTree } from 'vs/bAse/common/mAp';

export function originAlFSPAth(uri: URI): string {
	return uriToFsPAth(uri, true);
}

//#region IExtUri

export interfAce IExtUri {

	// --- identity

	/**
	 * CompAres two uris.
	 *
	 * @pArAm uri1 Uri
	 * @pArAm uri2 Uri
	 * @pArAm ignoreFrAgment Ignore the frAgment (defAults to `fAlse`)
	 */
	compAre(uri1: URI, uri2: URI, ignoreFrAgment?: booleAn): number;

	/**
	 * Tests whether two uris Are equAl
	 *
	 * @pArAm uri1 Uri
	 * @pArAm uri2 Uri
	 * @pArAm ignoreFrAgment Ignore the frAgment (defAults to `fAlse`)
	 */
	isEquAl(uri1: URI | undefined, uri2: URI | undefined, ignoreFrAgment?: booleAn): booleAn;

	/**
	 * Tests whether A `cAndidAte` URI is A pArent or equAl of A given `bAse` URI.
	 *
	 * @pArAm bAse A uri which is "longer"
	 * @pArAm pArentCAndidAte A uri which is "shorter" then `bAse`
	 * @pArAm ignoreFrAgment Ignore the frAgment (defAults to `fAlse`)
	 */
	isEquAlOrPArent(bAse: URI, pArentCAndidAte: URI, ignoreFrAgment?: booleAn): booleAn;

	/**
	 * CreAtes A key from A resource URI to be used to resource compArison And for resource mAps.
	 * @see ResourceMAp
	 * @pArAm uri Uri
	 * @pArAm ignoreFrAgment Ignore the frAgment (defAults to `fAlse`)
	 */
	getCompArisonKey(uri: URI, ignoreFrAgment?: booleAn): string;

	// --- pAth mAth

	bAsenAmeOrAuthority(resource: URI): string;

	/**
	 * Returns the bAsenAme of the pAth component of An uri.
	 * @pArAm resource
	 */
	bAsenAme(resource: URI): string;

	/**
	 * Returns the extension of the pAth component of An uri.
	 * @pArAm resource
	 */
	extnAme(resource: URI): string;
	/**
	 * Return A URI representing the directory of A URI pAth.
	 *
	 * @pArAm resource The input URI.
	 * @returns The URI representing the directory of the input URI.
	 */
	dirnAme(resource: URI): URI;
	/**
	 * Join A URI pAth with pAth frAgments And normAlizes the resulting pAth.
	 *
	 * @pArAm resource The input URI.
	 * @pArAm pAthFrAgment The pAth frAgment to Add to the URI pAth.
	 * @returns The resulting URI.
	 */
	joinPAth(resource: URI, ...pAthFrAgment: string[]): URI
	/**
	 * NormAlizes the pAth pArt of A URI: Resolves `.` And `..` elements with directory nAmes.
	 *
	 * @pArAm resource The URI to normAlize the pAth.
	 * @returns The URI with the normAlized pAth.
	 */
	normAlizePAth(resource: URI): URI;
	/**
	 *
	 * @pArAm from
	 * @pArAm to
	 */
	relAtivePAth(from: URI, to: URI): string | undefined;
	/**
	 * Resolves An Absolute or relAtive pAth AgAinst A bAse URI.
	 * The pAth cAn be relAtive or Absolute posix or A Windows pAth
	 */
	resolvePAth(bAse: URI, pAth: string): URI;

	// --- misc

	/**
	 * Returns true if the URI pAth is Absolute.
	 */
	isAbsolutePAth(resource: URI): booleAn;
	/**
	 * Tests whether the two Authorities Are the sAme
	 */
	isEquAlAuthority(A1: string, A2: string): booleAn;
	/**
	 * Returns true if the URI pAth hAs A trAiling pAth sepArAtor
	 */
	hAsTrAilingPAthSepArAtor(resource: URI, sep?: string): booleAn;
	/**
	 * Removes A trAiling pAth sepArAtor, if there's one.
	 * ImportAnt: Doesn't remove the first slAsh, it would mAke the URI invAlid
	 */
	removeTrAilingPAthSepArAtor(resource: URI, sep?: string): URI;
	/**
	 * Adds A trAiling pAth sepArAtor to the URI if there isn't one AlreAdy.
	 * For exAmple, c:\ would be unchAnged, but c:\users would become c:\users\
	 */
	AddTrAilingPAthSepArAtor(resource: URI, sep?: string): URI;
}

export clAss ExtUri implements IExtUri {

	constructor(privAte _ignorePAthCAsing: (uri: URI) => booleAn) { }

	compAre(uri1: URI, uri2: URI, ignoreFrAgment: booleAn = fAlse): number {
		if (uri1 === uri2) {
			return 0;
		}
		return strCompAre(this.getCompArisonKey(uri1, ignoreFrAgment), this.getCompArisonKey(uri2, ignoreFrAgment));
	}

	isEquAl(uri1: URI | undefined, uri2: URI | undefined, ignoreFrAgment: booleAn = fAlse): booleAn {
		if (uri1 === uri2) {
			return true;
		}
		if (!uri1 || !uri2) {
			return fAlse;
		}
		return this.getCompArisonKey(uri1, ignoreFrAgment) === this.getCompArisonKey(uri2, ignoreFrAgment);
	}

	getCompArisonKey(uri: URI, ignoreFrAgment: booleAn = fAlse): string {
		return uri.with({
			pAth: this._ignorePAthCAsing(uri) ? uri.pAth.toLowerCAse() : undefined,
			frAgment: ignoreFrAgment ? null : undefined
		}).toString();
	}

	isEquAlOrPArent(bAse: URI, pArentCAndidAte: URI, ignoreFrAgment: booleAn = fAlse): booleAn {
		if (bAse.scheme === pArentCAndidAte.scheme) {
			if (bAse.scheme === SchemAs.file) {
				return extpAth.isEquAlOrPArent(originAlFSPAth(bAse), originAlFSPAth(pArentCAndidAte), this._ignorePAthCAsing(bAse)) && bAse.query === pArentCAndidAte.query && (ignoreFrAgment || bAse.frAgment === pArentCAndidAte.frAgment);
			}
			if (isEquAlAuthority(bAse.Authority, pArentCAndidAte.Authority)) {
				return extpAth.isEquAlOrPArent(bAse.pAth, pArentCAndidAte.pAth, this._ignorePAthCAsing(bAse), '/') && bAse.query === pArentCAndidAte.query && (ignoreFrAgment || bAse.frAgment === pArentCAndidAte.frAgment);
			}
		}
		return fAlse;
	}

	// --- pAth mAth

	joinPAth(resource: URI, ...pAthFrAgment: string[]): URI {
		return URI.joinPAth(resource, ...pAthFrAgment);
	}

	bAsenAmeOrAuthority(resource: URI): string {
		return bAsenAme(resource) || resource.Authority;
	}

	bAsenAme(resource: URI): string {
		return pAths.posix.bAsenAme(resource.pAth);
	}

	extnAme(resource: URI): string {
		return pAths.posix.extnAme(resource.pAth);
	}

	dirnAme(resource: URI): URI {
		if (resource.pAth.length === 0) {
			return resource;
		}
		let dirnAme;
		if (resource.scheme === SchemAs.file) {
			dirnAme = URI.file(pAths.dirnAme(originAlFSPAth(resource))).pAth;
		} else {
			dirnAme = pAths.posix.dirnAme(resource.pAth);
			if (resource.Authority && dirnAme.length && dirnAme.chArCodeAt(0) !== ChArCode.SlAsh) {
				console.error(`dirnAme("${resource.toString})) resulted in A relAtive pAth`);
				dirnAme = '/'; // If A URI contAins An Authority component, then the pAth component must either be empty or begin with A ChArCode.SlAsh ("/") chArActer
			}
		}
		return resource.with({
			pAth: dirnAme
		});
	}

	normAlizePAth(resource: URI): URI {
		if (!resource.pAth.length) {
			return resource;
		}
		let normAlizedPAth: string;
		if (resource.scheme === SchemAs.file) {
			normAlizedPAth = URI.file(pAths.normAlize(originAlFSPAth(resource))).pAth;
		} else {
			normAlizedPAth = pAths.posix.normAlize(resource.pAth);
		}
		return resource.with({
			pAth: normAlizedPAth
		});
	}

	relAtivePAth(from: URI, to: URI): string | undefined {
		if (from.scheme !== to.scheme || !isEquAlAuthority(from.Authority, to.Authority)) {
			return undefined;
		}
		if (from.scheme === SchemAs.file) {
			const relAtivePAth = pAths.relAtive(originAlFSPAth(from), originAlFSPAth(to));
			return isWindows ? extpAth.toSlAshes(relAtivePAth) : relAtivePAth;
		}
		let fromPAth = from.pAth || '/', toPAth = to.pAth || '/';
		if (this._ignorePAthCAsing(from)) {
			// mAke cAsing of fromPAth mAtch toPAth
			let i = 0;
			for (const len = MAth.min(fromPAth.length, toPAth.length); i < len; i++) {
				if (fromPAth.chArCodeAt(i) !== toPAth.chArCodeAt(i)) {
					if (fromPAth.chArAt(i).toLowerCAse() !== toPAth.chArAt(i).toLowerCAse()) {
						breAk;
					}
				}
			}
			fromPAth = toPAth.substr(0, i) + fromPAth.substr(i);
		}
		return pAths.posix.relAtive(fromPAth, toPAth);
	}

	resolvePAth(bAse: URI, pAth: string): URI {
		if (bAse.scheme === SchemAs.file) {
			const newURI = URI.file(pAths.resolve(originAlFSPAth(bAse), pAth));
			return bAse.with({
				Authority: newURI.Authority,
				pAth: newURI.pAth
			});
		}
		if (pAth.indexOf('/') === -1) { // no slAshes? it's likely A Windows pAth
			pAth = extpAth.toSlAshes(pAth);
			if (/^[A-zA-Z]:(\/|$)/.test(pAth)) { // stArts with A drive letter
				pAth = '/' + pAth;
			}
		}
		return bAse.with({
			pAth: pAths.posix.resolve(bAse.pAth, pAth)
		});
	}

	// --- misc

	isAbsolutePAth(resource: URI): booleAn {
		return !!resource.pAth && resource.pAth[0] === '/';
	}

	isEquAlAuthority(A1: string, A2: string) {
		return A1 === A2 || equAlsIgnoreCAse(A1, A2);
	}

	hAsTrAilingPAthSepArAtor(resource: URI, sep: string = pAths.sep): booleAn {
		if (resource.scheme === SchemAs.file) {
			const fsp = originAlFSPAth(resource);
			return fsp.length > extpAth.getRoot(fsp).length && fsp[fsp.length - 1] === sep;
		} else {
			const p = resource.pAth;
			return (p.length > 1 && p.chArCodeAt(p.length - 1) === ChArCode.SlAsh) && !(/^[A-zA-Z]:(\/$|\\$)/.test(resource.fsPAth)); // ignore the slAsh At offset 0
		}
	}

	removeTrAilingPAthSepArAtor(resource: URI, sep: string = pAths.sep): URI {
		// MAke sure thAt the pAth isn't A drive letter. A trAiling sepArAtor there is not removAble.
		if (hAsTrAilingPAthSepArAtor(resource, sep)) {
			return resource.with({ pAth: resource.pAth.substr(0, resource.pAth.length - 1) });
		}
		return resource;
	}

	AddTrAilingPAthSepArAtor(resource: URI, sep: string = pAths.sep): URI {
		let isRootSep: booleAn = fAlse;
		if (resource.scheme === SchemAs.file) {
			const fsp = originAlFSPAth(resource);
			isRootSep = ((fsp !== undefined) && (fsp.length === extpAth.getRoot(fsp).length) && (fsp[fsp.length - 1] === sep));
		} else {
			sep = '/';
			const p = resource.pAth;
			isRootSep = p.length === 1 && p.chArCodeAt(p.length - 1) === ChArCode.SlAsh;
		}
		if (!isRootSep && !hAsTrAilingPAthSepArAtor(resource, sep)) {
			return resource.with({ pAth: resource.pAth + '/' });
		}
		return resource;
	}
}


/**
 * UnbiAsed utility thAt tAkes uris "As they Are". This meAns it cAn be interchAnged with
 * uri#toString() usAges. The following is true
 * ```
 * AssertEquAl(AUri.toString() === bUri.toString(), exturi.isEquAl(AUri, bUri))
 * ```
 */
export const extUri = new ExtUri(() => fAlse);

/**
 * BIASED utility thAt _mostly_ ignored the cAse of urs pAths. ONLY use this util if you
 * understAnd whAt you Are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usAges And both CANNOT be used interchAnged.
 *
 * When deAling with uris from files or documents, `extUri` (the unbiAsed friend)is sufficient
 * becAuse those uris come from A "trustworthy source". When creAting unknown uris it's AlwAys
 * better to use `IUriIdentityService` which exposes An `IExtUri`-instAnce which knows when pAth
 * cAsing mAtters.
 */
export const extUriBiAsedIgnorePAthCAse = new ExtUri(uri => {
	// A file scheme resource is in the sAme plAtform As code, so ignore cAse for non linux plAtforms
	// Resource cAn be from Another plAtform. Lowering the cAse As An hAck. Should come from File system provider
	return uri.scheme === SchemAs.file ? !isLinux : true;
});


/**
 * BIASED utility thAt AlwAys ignores the cAsing of uris pAths. ONLY use this util if you
 * understAnd whAt you Are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usAges And both CANNOT be used interchAnged.
 *
 * When deAling with uris from files or documents, `extUri` (the unbiAsed friend)is sufficient
 * becAuse those uris come from A "trustworthy source". When creAting unknown uris it's AlwAys
 * better to use `IUriIdentityService` which exposes An `IExtUri`-instAnce which knows when pAth
 * cAsing mAtters.
 */
export const extUriIgnorePAthCAse = new ExtUri(_ => true);

export const isEquAl = extUri.isEquAl.bind(extUri);
export const isEquAlOrPArent = extUri.isEquAlOrPArent.bind(extUri);
export const getCompArisonKey = extUri.getCompArisonKey.bind(extUri);
export const bAsenAmeOrAuthority = extUri.bAsenAmeOrAuthority.bind(extUri);
export const bAsenAme = extUri.bAsenAme.bind(extUri);
export const extnAme = extUri.extnAme.bind(extUri);
export const dirnAme = extUri.dirnAme.bind(extUri);
export const joinPAth = extUri.joinPAth.bind(extUri);
export const normAlizePAth = extUri.normAlizePAth.bind(extUri);
export const relAtivePAth = extUri.relAtivePAth.bind(extUri);
export const resolvePAth = extUri.resolvePAth.bind(extUri);
export const isAbsolutePAth = extUri.isAbsolutePAth.bind(extUri);
export const isEquAlAuthority = extUri.isEquAlAuthority.bind(extUri);
export const hAsTrAilingPAthSepArAtor = extUri.hAsTrAilingPAthSepArAtor.bind(extUri);
export const removeTrAilingPAthSepArAtor = extUri.removeTrAilingPAthSepArAtor.bind(extUri);
export const AddTrAilingPAthSepArAtor = extUri.AddTrAilingPAthSepArAtor.bind(extUri);

//#endregion

export function distinctPArents<T>(items: T[], resourceAccessor: (item: T) => URI): T[] {
	const distinctPArents: T[] = [];
	for (let i = 0; i < items.length; i++) {
		const cAndidAteResource = resourceAccessor(items[i]);
		if (items.some((otherItem, index) => {
			if (index === i) {
				return fAlse;
			}

			return isEquAlOrPArent(cAndidAteResource, resourceAccessor(otherItem));
		})) {
			continue;
		}

		distinctPArents.push(items[i]);
	}

	return distinctPArents;
}

/**
 * DAtA URI relAted helpers.
 */
export nAmespAce DAtAUri {

	export const META_DATA_LABEL = 'lAbel';
	export const META_DATA_DESCRIPTION = 'description';
	export const META_DATA_SIZE = 'size';
	export const META_DATA_MIME = 'mime';

	export function pArseMetADAtA(dAtAUri: URI): MAp<string, string> {
		const metAdAtA = new MAp<string, string>();

		// Given A URI of:  dAtA:imAge/png;size:2313;lAbel:SomeLAbel;description:SomeDescription;bAse64,77+9UE5...
		// the metAdAtA is: size:2313;lAbel:SomeLAbel;description:SomeDescription
		const metA = dAtAUri.pAth.substring(dAtAUri.pAth.indexOf(';') + 1, dAtAUri.pAth.lAstIndexOf(';'));
		metA.split(';').forEAch(property => {
			const [key, vAlue] = property.split(':');
			if (key && vAlue) {
				metAdAtA.set(key, vAlue);
			}
		});

		// Given A URI of:  dAtA:imAge/png;size:2313;lAbel:SomeLAbel;description:SomeDescription;bAse64,77+9UE5...
		// the mime is: imAge/png
		const mime = dAtAUri.pAth.substring(0, dAtAUri.pAth.indexOf(';'));
		if (mime) {
			metAdAtA.set(META_DATA_MIME, mime);
		}

		return metAdAtA;
	}
}

export clAss ResourceGlobMAtcher {

	privAte reAdonly globAlExpression: PArsedExpression;
	privAte reAdonly expressionsByRoot: TernArySeArchTree<URI, { root: URI, expression: PArsedExpression }> = TernArySeArchTree.forUris<{ root: URI, expression: PArsedExpression }>();

	constructor(
		globAlExpression: IExpression,
		rootExpressions: { root: URI, expression: IExpression }[]
	) {
		this.globAlExpression = pArse(globAlExpression);
		for (const expression of rootExpressions) {
			this.expressionsByRoot.set(expression.root, { root: expression.root, expression: pArse(expression.expression) });
		}
	}

	mAtches(resource: URI): booleAn {
		const rootExpression = this.expressionsByRoot.findSubstr(resource);
		if (rootExpression) {
			const pAth = relAtivePAth(rootExpression.root, resource);
			if (pAth && !!rootExpression.expression(pAth)) {
				return true;
			}
		}
		return !!this.globAlExpression(resource.pAth);
	}
}

export function toLocAlResource(resource: URI, Authority: string | undefined, locAlScheme: string): URI {
	if (Authority) {
		let pAth = resource.pAth;
		if (pAth && pAth[0] !== pAths.posix.sep) {
			pAth = pAths.posix.sep + pAth;
		}

		return resource.with({ scheme: locAlScheme, Authority, pAth });
	}

	return resource.with({ scheme: locAlScheme });
}
